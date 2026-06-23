// POST /api/public/v1/terminals/invoice/:id/cancel  (HMAC-signed)

import { createFileRoute } from "@tanstack/react-router";

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

export const Route = createFileRoute("/api/public/v1/terminals/invoice/$id/cancel")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request, params }) => {
        try {
          const rawBody = await request.text();
          const { verifyTerminalSignature } = await import("@/lib/terminals.server");
          const auth = await verifyTerminalSignature(request, rawBody);
          if (!auth.ok) return json({ error: auth.error }, auth.status);

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: inv } = await supabaseAdmin
            .from("invoices")
            .select("id, store_id, status")
            .eq("id", params.id)
            .maybeSingle();
          if (!inv) return json({ error: "Invoice not found." }, 404);
          if (inv.store_id !== auth.terminal.store_id) return json({ error: "Forbidden." }, 403);
          if (inv.status !== "pending") return json({ ok: true, status: inv.status });

          const { error } = await supabaseAdmin
            .from("invoices")
            .update({ status: "cancelled" })
            .eq("id", inv.id);
          if (error) return json({ error: error.message }, 500);
          return json({ ok: true, status: "cancelled" });
        } catch (err) {
          return json({ error: err instanceof Error ? err.message : "Server error" }, 500);
        }
      },
    },
  },
});
