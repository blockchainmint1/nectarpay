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
            .select("id, fiat_currency, invoice_ttl_seconds, preferred_evm_chain")
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

          // If the cashier pre-selected a chain (or chain:STABLE), derive the
          // address now so the QR is a direct pay URL instead of a checkout page.
          let preselectedChain: string | null = null;
          let preselectedToken: string | null = null;
          if (body.option) {
            const [chainRaw, tokenRaw] = body.option.split(":");
            const chain = chainRaw.toLowerCase();
            const tokenSymbol = tokenRaw ? tokenRaw.toUpperCase() : null;
            if (!VALID_CHAINS.has(chain)) return json({ error: "Unsupported chain." }, 400);
            if (tokenSymbol && !VALID_STABLES.has(tokenSymbol)) return json({ error: "Unsupported token." }, 400);

            try {
              const { deriveInvoiceAddress } = await import("@/lib/invoice-derive.server");
              const derived = await deriveInvoiceAddress(
                store.id,
                chain as never,
                fiatAmount,
                tokenSymbol,
              );
              const { error: updErr } = await supabaseAdmin
                .from("invoices")
                .update({
                  chain: chain as never,
                  token_symbol: tokenSymbol,
                  address: derived.address,
                  crypto_amount: derived.cryptoAmount,
                  rate: derived.rate,
                  derivation_index: derived.index,
                  address_index: derived.index,
                })
                .eq("id", inserted.id);
              if (updErr) return json({ error: updErr.message }, 500);
              preselectedChain = chain;
              preselectedToken = tokenSymbol;
            } catch (e) {
              return json({ error: e instanceof Error ? e.message : "Could not derive address" }, 500);
            }
          }

          // Touch last_seen_at + opportunistically refresh GeoIP; ignore errors.
          {
            const { touchTerminalSeen } = await import("@/lib/terminal-geo.server");
            await touchTerminalSeen(request, auth.terminal as Parameters<typeof touchTerminalSeen>[1]);
          }

          const origin = new URL(request.url).origin;
          // Re-read derived fields so terminal can render a wallet QR directly.
          const { data: full } = await supabaseAdmin
            .from("invoices")
            .select("address, crypto_amount")
            .eq("id", inserted.id)
            .maybeSingle();

          // Mint an NFC tap-handoff nonce so the terminal app can write an
          // NDEF tag for the HME Mobile wallet (or any compatible wallet).
          // See src/lib/tap-handoff.server.ts for the URL scheme.
          let tap: Awaited<ReturnType<typeof import("@/lib/tap-handoff.server").issueTapHandoff>> | null = null;
          try {
            const { issueTapHandoff } = await import("@/lib/tap-handoff.server");
            tap = await issueTapHandoff(inserted.id, origin);
          } catch (e) {
            console.error("[terminal-invoice] tap handoff issue failed:", e);
          }

          return json({
            id: inserted.id,
            checkout_url: `${origin}/i/${inserted.id}`,
            fiat_amount: fiatAmount,
            currency,
            status: "pending",
            chain: preselectedChain,
            token_symbol: preselectedToken,
            address: full?.address ?? null,
            crypto_amount: full?.crypto_amount ?? null,
            expires_at: expiresAt,
            preferred_evm_chain: (store as { preferred_evm_chain?: string }).preferred_evm_chain ?? "base",
            tap_url: tap?.tap_url ?? null,
            tap_universal_url: tap?.tap_universal_url ?? null,
            tap_expires_at: tap?.expires_at ?? null,
          }, 201);


        } catch (err) {
          return json({ error: err instanceof Error ? err.message : "Server error" }, 500);
        }
      },
    },
  },
});
