// POST /api/public/v1/terminals/invoice/$id/receipt  (HMAC-signed)
// Records customer email and/or captured signature on a paid invoice.
// Body: { email?: string, signature_data_url?: string }
//
// If the store has email receipts enabled and an email is provided, we save it
// on the invoice. Actual email send is handled separately (via the Lovable
// email queue once email infra is set up by the merchant).

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

// data:image/png;base64,XXXX — small canvas signature, typically < 30KB.
const MAX_SIGNATURE_BYTES = 200_000;

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

          let body: { email?: unknown; signature_data_url?: unknown } = {};
          try { body = raw ? JSON.parse(raw) : {}; } catch { return json({ error: "Invalid JSON" }, 400); }

          const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : null;
          const sig = typeof body.signature_data_url === "string" ? body.signature_data_url : null;

          if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return json({ error: "Invalid email" }, 400);
          }
          if (sig && (sig.length > MAX_SIGNATURE_BYTES || !sig.startsWith("data:image/"))) {
            return json({ error: "Signature too large or invalid" }, 400);
          }

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          // Confirm invoice belongs to this terminal's store before mutating.
          const { data: inv, error: invErr } = await supabaseAdmin
            .from("invoices")
            .select("id, store_id")
            .eq("id", params.id)
            .maybeSingle();
          if (invErr) return json({ error: invErr.message }, 500);
          if (!inv) return json({ error: "Invoice not found" }, 404);
          if (inv.store_id !== auth.terminal.store_id) return json({ error: "Forbidden" }, 403);

          const patch: Record<string, string | null> = {};
          if (email !== null) patch.customer_email = email;
          if (sig !== null) patch.signature_data_url = sig;
          if (Object.keys(patch).length === 0) return json({ ok: true });

          const { error: upErr } = await supabaseAdmin
            .from("invoices")
            .update(patch)
            .eq("id", params.id);
          if (upErr) return json({ error: upErr.message }, 500);

          return json({ ok: true });
        } catch (err) {
          return json({ error: err instanceof Error ? err.message : "Server error" }, 500);
        }
      },
    },
  },
});
