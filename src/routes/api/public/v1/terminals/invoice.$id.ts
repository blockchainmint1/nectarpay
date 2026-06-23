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
            .select("id, store_id, status, chain, crypto_amount, address, fiat_amount, fiat_currency, expires_at, updated_at")
            .eq("id", params.id)
            .maybeSingle();
          if (!inv) return json({ error: "Invoice not found." }, 404);
          if (inv.store_id !== auth.terminal.store_id) return json({ error: "Forbidden." }, 403);

          // Pull the first confirmed tx hash, if any.
          const { data: tx } = await supabaseAdmin
            .from("transactions")
            .select("tx_hash, confirmed_at")
            .eq("invoice_id", inv.id)
            .order("first_seen_at", { ascending: true })
            .limit(1)
            .maybeSingle();

          return json({
            id: inv.id,
            status: inv.status,
            chain: inv.chain,
            crypto_amount: inv.crypto_amount,
            address: inv.address,
            tx_hash: tx?.tx_hash ?? null,
            paid_at: tx?.confirmed_at ?? null,
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
