// Email an invoice to a customer.
// POST /api/public/v1/invoices/{id}/email   Bearer sk_live_…
// Body (optional): { "to": "customer@example.com" }
// Falls back to the invoice's buyer_email when `to` is omitted.

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { apiJson, apiPreflight } from "@/lib/public-api";

const Body = z.object({ to: z.string().email().max(255).optional() });

export const Route = createFileRoute("/api/public/v1/invoices/$id/email")({
  server: {
    handlers: {
      OPTIONS: async () => apiPreflight(),
      POST: async ({ request, params }) => {
        try {
          const { authenticateApiKey } = await import("@/lib/api-key-auth.server");
          const auth = await authenticateApiKey(request);
          if ("error" in auth) return auth.error;
          const { keyRow, supabaseAdmin } = auth;

          const raw = await request.json().catch(() => ({}));
          const parsed = Body.safeParse(raw ?? {});
          if (!parsed.success) return apiJson({ error: "Invalid body: `to` must be an email." }, 400);

          const { data: inv } = await supabaseAdmin
            .from("invoices")
            .select(
              "id, store_id, fiat_amount, fiat_currency, description, buyer_email, customer_email, status, expires_at, email_send_count, email_sent_at, stores!inner(name)",
            )
            .eq("id", params.id)
            .maybeSingle();
          if (!inv || inv.store_id !== keyRow.store_id) {
            return apiJson({ error: "Invoice not found." }, 404);
          }
          if (["confirmed", "overpaid", "cancelled"].includes(inv.status)) {
            return apiJson({ error: `Invoice status is '${inv.status}'; nothing to send.` }, 400);
          }

          const to = parsed.data.to ?? inv.buyer_email ?? inv.customer_email;
          if (!to) return apiJson({ error: "No recipient. Pass `to` or set buyer_email on the invoice." }, 400);

          // Keep an emailed link payable for at least a day.
          const expiresAt =
            new Date(inv.expires_at).getTime() < Date.now() + 86_400_000
              ? new Date(Date.now() + 7 * 86_400_000).toISOString()
              : inv.expires_at;

          const storeName =
            (inv as unknown as { stores?: { name?: string } }).stores?.name ?? "Merchant";

          const { sendInvoiceEmail } = await import("@/lib/store-invoices.server");
          const res = await sendInvoiceEmail(to, {
            invoiceId: inv.id,
            storeName,
            amount: Number(inv.fiat_amount),
            currency: inv.fiat_currency,
            description: inv.description,
            expiresAt,
            reminder: (inv.email_send_count ?? 0) > 0,
          });
          if (!res.ok) return apiJson({ error: res.error ?? "Could not send email." }, 502);

          const sentAt = new Date().toISOString();
          await supabaseAdmin
            .from("invoices")
            .update({
              email_sent_at: sentAt,
              email_send_count: (inv.email_send_count ?? 0) + 1,
              expires_at: expiresAt,
              buyer_email: to,
              customer_email: to,
            })
            .eq("id", inv.id);

          const origin = new URL(request.url).origin;
          return apiJson({
            ok: true,
            to,
            sent_at: sentAt,
            send_count: (inv.email_send_count ?? 0) + 1,
            expires_at: expiresAt,
            checkout_url: `${origin}/i/${inv.id}`,
          });
        } catch (err) {
          return apiJson({ error: err instanceof Error ? err.message : "Server error" }, 500);
        }
      },
    },
  },
});
