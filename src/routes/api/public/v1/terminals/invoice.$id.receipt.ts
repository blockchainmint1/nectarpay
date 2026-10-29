// POST /api/public/v1/terminals/invoice/$id/receipt  (HMAC-signed)
// Records customer email and/or captured signature on a paid invoice.
// Body: { email?: string, signature_data_url?: string }
//
// Customer email is saved for merchant records; completed sales send a receipt.

import { createFileRoute } from "@tanstack/react-router";
import { customerContactSchema } from "@/lib/customers";
import { parseSignatureDataUrl } from "@/lib/sale-signature";

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

export const Route = createFileRoute("/api/public/v1/terminals/invoice/$id/receipt")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request, params }) => {
        try {
          const raw = await request.text();
          const { verifyTerminalSignature } = await import("@/lib/terminals.server");
          const auth = await verifyTerminalSignature(request, raw);
          if (!auth.ok) return json({ error: auth.error }, auth.status);

          let body: { email?: unknown; signature_data_url?: unknown; marketing_opt_in?: unknown } = {};
          try { body = raw ? JSON.parse(raw) : {}; } catch { return json({ error: "Invalid JSON" }, 400); }

          const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : null;
          const sig = typeof body.signature_data_url === "string" ? body.signature_data_url : null;
          const contact = body.email !== undefined ? customerContactSchema.safeParse({ email: body.email, marketing_opt_in: body.marketing_opt_in }) : null;
          if (contact && !contact.success) return json({ error: "Invalid email or signup preference" }, 400);
          if (!contact && body.marketing_opt_in !== undefined) return json({ error: "Email required for signup preference" }, 400);

          if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return json({ error: "Invalid email" }, 400);
          }
          // Only a real PNG/JJPEG image is accepted: it is stored as a file and
          // later shown in a browser and in the customer's receipt email.
          const signature = sig === null ? null : parseSignatureDataUrl(sig);
          if (sig !== null && !signature) return json({ error: "Signature must be a PNG or JPEG image" }, 400);

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          // Confirm invoice belongs to this terminal's store before mutating.
          const { data: inv, error: invErr } = await supabaseAdmin
            .from("invoices")
            .select("id, store_id, status")
            .eq("id", params.id)
            .maybeSingle();
          if (invErr) return json({ error: invErr.message }, 500);
          if (!inv) return json({ error: "Invoice not found" }, 404);
          if (inv.store_id !== auth.terminal.store_id) return json({ error: "Forbidden" }, 403);
          if (!["confirmed", "overpaid"].includes(inv.status)) return json({ error: "Payment is not complete" }, 409);

          const patch: {
            customer_email?: string;
            signature_path?: string;
            signature_data_url?: string;
          } = {};
          if (email !== null) patch.customer_email = email;
          if (signature) {
            const { storeSaleSignature } = await import("@/lib/sale-signature.server");
            const path = await storeSaleSignature(params.id, signature);
            // The file is the record of the signature; the inline copy is kept
            // only when the upload itself failed, so nothing is ever lost.
            if (path) patch.signature_path = path;
            else patch.signature_data_url = sig as string;
          }
          if (Object.keys(patch).length === 0) return json({ ok: true });

          const { error: upErr } = await supabaseAdmin
            .from("invoices")
            .update(patch)
            .eq("id", params.id);
          if (upErr) return json({ error: upErr.message }, 500);

          if (email) {
            const { recordCustomerConsent } = await import("@/lib/customer-consent.server");
            await recordCustomerConsent(inv.store_id, inv.id, email, contact?.success ? contact.data.marketing_opt_in : false, "pos");
            const { sendCustomerReceipt } = await import("@/lib/email/customer-receipt.server");
            const result = await sendCustomerReceipt(params.id);
            if (!result.sent) return json({ error: result.error ?? "Receipt was not sent" }, 502);
          }

          return json({ ok: true });
        } catch (err) {
          return json({ error: err instanceof Error ? err.message : "Server error" }, 500);
        }
      },
    },
  },
});
