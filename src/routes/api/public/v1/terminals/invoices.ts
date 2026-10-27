// GET /api/public/v1/terminals/invoices  (HMAC-signed)
// Recent invoices for the paired terminal's store.

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

export const Route = createFileRoute("/api/public/v1/terminals/invoices")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        try {
          const { verifyTerminalSignature } = await import("@/lib/terminals.server");
          const auth = await verifyTerminalSignature(request, "");
          if (!auth.ok) return json({ error: auth.error }, auth.status);

          const url = new URL(request.url);
          const limitRaw = Number(url.searchParams.get("limit") ?? "25");
          const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 25;

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data, error } = await supabaseAdmin
            .from("invoices")
            .select(
              "id, fiat_amount, fiat_currency, status, chain, token_symbol, crypto_amount, description, external_order_id, created_at",
            )
            .eq("store_id", auth.terminal.store_id)
            .order("created_at", { ascending: false })
            .limit(limit);
          if (error) return json({ error: error.message }, 500);

          return json({ invoices: data ?? [] });
        } catch (err) {
          return json({ error: err instanceof Error ? err.message : "Server error" }, 500);
        }
      },
    },
  },
});
