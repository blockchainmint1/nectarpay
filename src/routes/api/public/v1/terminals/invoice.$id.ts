// GET /api/public/v1/terminals/invoice/:id  (HMAC-signed)
// Polls invoice status. Scoped to the calling terminal's store.

import { createFileRoute } from "@tanstack/react-router";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Terminal-Id, X-Timestamp, X-Signature",
} as const;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

export const Route = createFileRoute("/api/public/v1/terminals/invoice/$id")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request, params }) => {
        try {
          const { verifyTerminalSignature } = await import("@/lib/terminals.server");
          // GET has no body — sign over empty string.
          const auth = await verifyTerminalSignature(request, "");
          if (!auth.ok) return json({ error: auth.error }, auth.status);

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: inv } = await supabaseAdmin
            .from("invoices")
            .select("id, store_id, status, chain, crypto_amount, address, fiat_amount, fiat_currency, expires_at, updated_at, token_symbol, rate")
            .eq("id", params.id)
            .maybeSingle();
          if (!inv) return json({ error: "Invoice not found." }, 404);
          if (inv.store_id !== auth.terminal.store_id) return json({ error: "Forbidden." }, 403);

          if (["pending", "detected", "underpaid"].includes(inv.status) && inv.chain && ["eth", "base", "bsc"].includes(inv.chain)) {
            const { scanEvmInvoiceNow } = await import("@/lib/watcher.functions");
            await scanEvmInvoiceNow(inv.id).catch((e) => {
              console.error("[terminal-invoice] hot EVM scan failed:", e);
            });
          }

          const { data: freshInv } = await supabaseAdmin
            .from("invoices")
            .select("id, store_id, status, chain, crypto_amount, address, fiat_amount, fiat_currency, expires_at, updated_at, token_symbol, rate")
            .eq("id", params.id)
            .maybeSingle();
          const invoice = freshInv ?? inv;

          // Pull the first confirmed tx hash, if any.
          const { data: tx } = await supabaseAdmin
            .from("transactions")
            .select("tx_hash, confirmed_at")
            .eq("invoice_id", invoice.id)
            .order("first_seen_at", { ascending: true })
            .limit(1)
            .maybeSingle();

          // Sum confirmed credits into USD so the POS can show
          // Owed / Paid / Due for the underpayment top-up flow.
          const { data: confirmedTxs } = await supabaseAdmin
            .from("transactions")
            .select("amount, token_symbol")
            .eq("invoice_id", invoice.id)
            .not("confirmed_at", "is", null);
          const isStable = !!invoice.token_symbol;
          const lockedRate = invoice.rate == null ? 0 : Number(invoice.rate);
          let paidUsd = 0;
          let paidCrypto = 0;
          for (const t of confirmedTxs ?? []) {
            const amt = Number(t.amount);
            if (!Number.isFinite(amt) || amt <= 0) continue;
            paidCrypto += amt;
            paidUsd += isStable ? amt : amt * lockedRate;
          }
          const owedUsd = Number(invoice.fiat_amount);
          const dueUsd = Math.max(0, owedUsd - paidUsd);
          const owedCrypto = invoice.crypto_amount == null ? null : Number(invoice.crypto_amount);
          const dueCrypto = owedCrypto == null ? null : Math.max(0, owedCrypto - paidCrypto);

          return json({
            id: invoice.id,
            status: invoice.status,
            chain: invoice.chain,
            crypto_amount: invoice.crypto_amount,
            address: invoice.address,
            tx_hash: tx?.tx_hash ?? null,
            paid_at: tx?.confirmed_at ?? null,
            fiat_amount: invoice.fiat_amount,
            currency: invoice.fiat_currency,
            expires_at: invoice.expires_at,
            token_symbol: invoice.token_symbol,
            paid_usd: Number(paidUsd.toFixed(4)),
            due_usd: Number(dueUsd.toFixed(4)),
            paid_crypto: paidCrypto,
            due_crypto: dueCrypto,
          });

        } catch (err) {
          return json({ error: err instanceof Error ? err.message : "Server error" }, 500);
        }
      },
    },
  },
});
