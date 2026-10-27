// Webhook delivery history for one invoice.
// GET /api/public/v1/invoices/{id}/webhooks   Bearer sk_live_…

import { createFileRoute } from "@tanstack/react-router";

import { apiJson, apiPreflight } from "@/lib/public-api";

export const Route = createFileRoute("/api/public/v1/invoices/$id/webhooks")({
  server: {
    handlers: {
      OPTIONS: async () => apiPreflight(),
      GET: async ({ request, params }) => {
        try {
          const { authenticateApiKey } = await import("@/lib/api-key-auth.server");
          const auth = await authenticateApiKey(request);
          if ("error" in auth) return auth.error;
          const { keyRow, supabaseAdmin } = auth;

          const { data: inv } = await supabaseAdmin
            .from("invoices")
            .select("id, store_id")
            .eq("id", params.id)
            .maybeSingle();
          if (!inv || inv.store_id !== keyRow.store_id) {
            return apiJson({ error: "Invoice not found." }, 404);
          }

          const { data: rows, error } = await supabaseAdmin
            .from("webhook_deliveries")
            .select("id, url, attempt, status_code, delivered_at, next_retry_at, created_at, response_body, payload")
            .eq("invoice_id", inv.id)
            .order("created_at", { ascending: false })
            .limit(50);
          if (error) return apiJson({ error: error.message }, 500);

          return apiJson({
            invoice_id: inv.id,
            deliveries: (rows ?? []).map((r) => ({
              id: r.id,
              url: r.url,
              attempt: r.attempt,
              status_code: r.status_code,
              ok: typeof r.status_code === "number" && r.status_code >= 200 && r.status_code < 300,
              delivered_at: r.delivered_at,
              next_retry_at: r.next_retry_at,
              created_at: r.created_at,
              response_body: (r.response_body ?? "").slice(0, 500) || null,
              event_type:
                (r.payload as { type?: string } | null)?.type ?? null,
              event_id: (r.payload as { id?: string } | null)?.id ?? null,
            })),
          });
        } catch (err) {
          return apiJson({ error: err instanceof Error ? err.message : "Server error" }, 500);
        }
      },
    },
  },
});
