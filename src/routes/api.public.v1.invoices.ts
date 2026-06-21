// Public invoice creation endpoint.
// POST /api/public/v1/invoices  — Bearer sk_live_<key>
// Returns { id, address, crypto_amount, checkout_url, expires_at }
//
// `chain` is OPTIONAL — if omitted, the customer picks their preferred
// payment network on the hosted checkout page from the merchant's enabled
// chains. When omitted, `address` / `crypto_amount` / `rate` are null until
// the customer makes a selection.

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { deriveInvoiceAddress } from "@/lib/invoice-derive.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
} as const;

function json(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS, ...extra },
  });
}

const Body = z.object({
  chain: z.enum(["btc", "txc", "eth", "base", "tron", "sol", "doge", "isk", "zcu"]).optional().nullable(),
  amount: z.number().positive().max(1_000_000),
  currency: z.string().min(3).max(8).default("USD"),
  order_id: z.string().max(128).nullable().optional(),
  description: z.string().max(512).nullable().optional(),
  redirect_url: z.string().url().max(1024).nullable().optional(),
  buyer_email: z.string().email().max(255).nullable().optional(),
  expires_in_seconds: z.number().int().min(60).max(86_400).optional(),
});

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const Route = createFileRoute("/api/public/v1/invoices")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        try {
          // ---- Authn: Bearer sk_live_<prefix>_<secret> ----
          const auth = request.headers.get("authorization") || "";
          const m = auth.match(/^Bearer\s+(sk_(?:live|test)_[A-Za-z0-9_-]+)$/);
          if (!m) return json({ error: "Missing or malformed Authorization header." }, 401);
          const fullKey = m[1];
          const prefix = fullKey.slice(0, 16);
          const keyHash = await sha256Hex(fullKey);

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: keyRow } = await supabaseAdmin
            .from("api_keys")
            .select("id, store_id, secret_hash, revoked_at")
            .eq("prefix", prefix)
            .maybeSingle();
          if (!keyRow || keyRow.revoked_at || keyRow.secret_hash !== keyHash) {
            return json({ error: "Invalid API key." }, 401);
          }

          const raw = await request.json().catch(() => null);
          const parse = Body.safeParse(raw);
          if (!parse.success) return json({ error: parse.error.errors[0]?.message ?? "Invalid body" }, 400);
          const body = parse.data;

          const { data: store } = await supabaseAdmin
            .from("stores")
            .select("id, fiat_currency, invoice_ttl_seconds")
            .eq("id", keyRow.store_id)
            .maybeSingle();
          if (!store) return json({ error: "Store not found." }, 404);

          const ttl = body.expires_in_seconds ?? store.invoice_ttl_seconds ?? 900;
          const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();
          const fiatAmount = body.amount;
          const currency = body.currency || store.fiat_currency;

          // If the merchant did NOT specify a chain, create a "pending-chain"
          // invoice and let the customer pick on the checkout page.
          if (!body.chain) {
            const { data: inserted, error: insErr } = await supabaseAdmin
              .from("invoices")
              .insert({
                store_id: store.id,
                chain: null,
                fiat_amount: fiatAmount,
                fiat_currency: currency,
                crypto_amount: null,
                rate: null,
                address: null,
                derivation_index: null,
                address_index: null,
                status: "pending",
                external_order_id: body.order_id ?? null,
                description: body.description ?? null,
                redirect_url: body.redirect_url ?? null,
                buyer_email: body.buyer_email ?? null,
                expires_at: expiresAt,
              })
              .select("id")
              .single();
            if (insErr || !inserted) return json({ error: insErr?.message ?? "Insert failed." }, 500);

            await supabaseAdmin.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", keyRow.id);

            const origin = new URL(request.url).origin;
            return json({
              id: inserted.id,
              address: null,
              crypto_amount: null,
              rate: null,
              fiat_amount: fiatAmount,
              currency,
              chain: null,
              status: "pending",
              expires_at: expiresAt,
              checkout_url: `${origin}/i/${inserted.id}`,
            }, 201);
          }

          // Merchant pre-selected the chain — derive immediately.
          let derived;
          try {
            derived = await deriveInvoiceAddress(store.id, body.chain, fiatAmount);
          } catch (e) {
            return json({ error: e instanceof Error ? e.message : "Derivation failed" }, 400);
          }

          const { data: inserted, error: insErr } = await supabaseAdmin
            .from("invoices")
            .insert({
              store_id: store.id,
              chain: body.chain,
              fiat_amount: fiatAmount,
              fiat_currency: currency,
              crypto_amount: derived.cryptoAmount,
              rate: derived.rate,
              address: derived.address,
              derivation_index: derived.index,
              address_index: derived.index,
              status: "pending",
              external_order_id: body.order_id ?? null,
              description: body.description ?? null,
              redirect_url: body.redirect_url ?? null,
              buyer_email: body.buyer_email ?? null,
              expires_at: expiresAt,
            })
            .select("id")
            .single();
          if (insErr || !inserted) return json({ error: insErr?.message ?? "Insert failed." }, 500);

          await supabaseAdmin.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", keyRow.id);

          const origin = new URL(request.url).origin;
          return json({
            id: inserted.id,
            address: derived.address,
            crypto_amount: derived.cryptoAmount,
            rate: derived.rate,
            fiat_amount: fiatAmount,
            currency,
            chain: body.chain,
            status: "pending",
            expires_at: expiresAt,
            checkout_url: `${origin}/i/${inserted.id}`,
          }, 201);
        } catch (err) {
          return json({ error: err instanceof Error ? err.message : "Server error" }, 500);
        }
      },
    },
  },
});
