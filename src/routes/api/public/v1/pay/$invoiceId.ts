// Public wallet-facing pay endpoint for the NFC tap-to-pay handoff.
// Called by the HME Mobile wallet (or any compatible wallet) after the
// customer taps their phone to a Nectar.Pay terminal.
//
// Auth: short-lived single-use nonce in ?t=<nonce>, minted per invoice when
// the terminal created the handoff. See src/lib/tap-handoff.server.ts.
//
// GET   /api/public/v1/pay/:invoiceId?t=<nonce>          — read invoice
// POST  /api/public/v1/pay/:invoiceId?t=<nonce>          — select chain/token
//                                                          (consumes nonce)
// OPTIONS — CORS preflight (open: any origin, wallet decides what to call)

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

const VALID_CHAINS = new Set(["btc", "txc", "eth", "base", "bsc", "tron", "sol", "doge", "isk", "zcu"]);
const VALID_STABLES = new Set(["USDC", "USDT", "PYUSD", "DAI"]);

const SelectBody = z.object({
  option: z.string().min(2).max(32), // "chain" or "chain:SYMBOL"
});

export const Route = createFileRoute("/api/public/v1/pay/$invoiceId")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),

      // ------------- READ -------------
      GET: async ({ request, params }) => {
        try {
          const url = new URL(request.url);
          const nonce = url.searchParams.get("t") ?? "";
          const { verifyTapHandoff } = await import("@/lib/tap-handoff.server");
          const auth = await verifyTapHandoff(params.invoiceId, nonce);
          if (!auth.ok) return json({ error: auth.error }, auth.status);

          const { getPublicInvoice } = await import("@/lib/checkout.functions");
          const result = await getPublicInvoice({ data: { id: params.invoiceId } });
          if (!result.found) return json({ error: "Invoice not found." }, 404);

          const inv = result.invoice;
          return json({
            id: inv.id,
            status: inv.status,
            fiat_amount: inv.fiatAmount,
            currency: inv.fiatCurrency,
            description: inv.description,
            expires_at: inv.expiresAt,
            merchant: result.store
              ? { name: result.store.name, website: result.store.website }
              : null,
            // Whatever the merchant has already pinned (often null for a
            // fresh tap invoice — the wallet picks below).
            chain: inv.chain,
            token_symbol: inv.tokenSymbol,
            crypto_amount: inv.cryptoAmount,
            rate: inv.rate,
            address: inv.address,
            // Every option the merchant accepts. Wallet picks the best the
            // customer has, then calls POST below.
            // Recommended priority order for HME Mobile:
            //   1) eth:USDC  (settles on Base, BSC, etc — cheapest gas)
            //   2) eth:USDT / tron:USDT / sol:USDC ...
            //   3) native cheap chains (base, sol, tron)
            //   4) txc, btc, eth mainnet
            options: result.availableOptions,
          });
        } catch (err) {
          return json({ error: err instanceof Error ? err.message : "Server error" }, 500);
        }
      },

      // ------------- SELECT (consumes nonce) -------------
      POST: async ({ request, params }) => {
        try {
          const url = new URL(request.url);
          const nonce = url.searchParams.get("t") ?? "";
          const raw = await request.json().catch(() => null);
          const v = SelectBody.safeParse(raw);
          if (!v.success) return json({ error: v.error.errors[0]?.message ?? "Bad body" }, 400);

          const [chainRaw, tokenRaw] = v.data.option.split(":");
          const chain = chainRaw.toLowerCase();
          const tokenSymbol = tokenRaw ? tokenRaw.toUpperCase() : null;
          if (!VALID_CHAINS.has(chain)) return json({ error: "Unsupported chain." }, 400);
          if (tokenSymbol && !VALID_STABLES.has(tokenSymbol)) {
            return json({ error: "Unsupported token." }, 400);
          }

          // Consume the nonce atomically. Even if the wallet retries the
          // POST, a second call returns 410 — but the first response
          // already contained the address, so the wallet can broadcast.
          const { verifyTapHandoff } = await import("@/lib/tap-handoff.server");
          const auth = await verifyTapHandoff(params.invoiceId, nonce, { consume: true });
          if (!auth.ok) return json({ error: auth.error }, auth.status);

          // Reuse the existing selectInvoiceChain logic (no-op if invoice
          // was already pinned to the same option).
          const { selectInvoiceChain } = await import("@/lib/checkout.functions");
          try {
            await selectInvoiceChain({ data: { id: params.invoiceId, option: v.data.option } });
          } catch (e) {
            return json({ error: e instanceof Error ? e.message : "Could not select chain." }, 400);
          }

          // Re-read the now-derived invoice so the wallet has everything
          // it needs to broadcast.
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: inv } = await supabaseAdmin
            .from("invoices")
            .select(
              "id, status, chain, token_symbol, fiat_amount, fiat_currency, crypto_amount, rate, address, expires_at",
            )
            .eq("id", params.invoiceId)
            .maybeSingle();
          if (!inv) return json({ error: "Invoice not found." }, 404);

          return json({
            id: inv.id,
            status: inv.status,
            chain: inv.chain,
            token_symbol: inv.token_symbol,
            address: inv.address,
            crypto_amount: inv.crypto_amount,
            rate: inv.rate,
            fiat_amount: inv.fiat_amount,
            currency: inv.fiat_currency,
            expires_at: inv.expires_at,
          });
        } catch (err) {
          return json({ error: err instanceof Error ? err.message : "Server error" }, 500);
        }
      },
    },
  },
});
