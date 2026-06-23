// POST /api/public/v1/terminals/invoice  (HMAC-signed)
// Creates a chain-less invoice on behalf of a paired terminal. The customer
// picks the chain on the hosted /i/<id> checkout page.

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Terminal-Id, X-Timestamp, X-Signature",
} as const;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

const Body = z.object({
  amount_cents: z.number().int().positive().max(100_000_000),
  currency: z.string().min(3).max(8).default("USD"),
  memo: z.string().max(512).optional().nullable(),
  expires_in_seconds: z.number().int().min(60).max(86_400).optional(),
  /** Optional pre-selected payment option. "chain" (e.g. "btc") or "chain:SYMBOL" ("eth:USDC").
   *  Omit / null to leave open — customer picks on the QR page. */
  option: z.string().min(2).max(32).optional().nullable(),
});

const VALID_CHAINS = new Set(["btc", "txc", "eth", "base", "bsc", "tron", "sol", "doge", "isk", "zcu"]);
const VALID_STABLES = new Set(["USDC", "USDT", "PYUSD", "DAI"]);

export const Route = createFileRoute("/api/public/v1/terminals/invoice")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        try {
          const rawBody = await request.text();
          const { verifyTerminalSignature } = await import("@/lib/terminals.server");
          const auth = await verifyTerminalSignature(request, rawBody);
          if (!auth.ok) return json({ error: auth.error }, auth.status);

          const parsed = (() => { try { return JSON.parse(rawBody); } catch { return null; } })();
          const v = Body.safeParse(parsed);
          if (!v.success) return json({ error: v.error.errors[0]?.message ?? "Bad body" }, 400);
          const body = v.data;
          const fiatAmount = body.amount_cents / 100;

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: store } = await supabaseAdmin
            .from("stores")
            .select("id, fiat_currency, invoice_ttl_seconds")
            .eq("id", auth.terminal.store_id)
            .maybeSingle();
          if (!store) return json({ error: "Store not found." }, 404);

          const ttl = body.expires_in_seconds ?? store.invoice_ttl_seconds ?? 900;
          const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();
          const currency = body.currency || store.fiat_currency;
          const memoBits = [`terminal:${auth.terminal.id}`, body.memo || null].filter(Boolean) as string[];

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
              description: memoBits.join(" | "),
              expires_at: expiresAt,
            })
            .select("id")
            .single();
          if (insErr || !inserted) return json({ error: insErr?.message ?? "Insert failed." }, 500);

          // Touch last_seen_at; ignore errors.
          await supabaseAdmin
            .from("terminals")
            .update({ last_seen_at: new Date().toISOString() })
            .eq("id", auth.terminal.id);

          const origin = new URL(request.url).origin;
          return json({
            id: inserted.id,
            checkout_url: `${origin}/i/${inserted.id}`,
            fiat_amount: fiatAmount,
            currency,
            status: "pending",
            expires_at: expiresAt,
          }, 201);
        } catch (err) {
          return json({ error: err instanceof Error ? err.message : "Server error" }, 500);
        }
      },
    },
  },
});
