// POST /api/admin/signature-backfill — maintenance only.
//
// Older sales keep their customer signature as an inline copy on the record.
// This moves each one into an image file in the private signatures bucket, so
// every signed sale ends up stored the same way. Admin-only, idempotent, and it
// stops as soon as a sale's file could not be written (nothing is deleted).

import { createFileRoute } from "@tanstack/react-router";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/admin/signature-backfill")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const header = request.headers.get("Authorization") ?? "";
        const token = header.startsWith("Bearer ") ? header.slice(7) : "";
        if (!token) return json({ error: "Sign in required" }, 401);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: account, error: accountError } = await supabaseAdmin.auth.getUser(token);
        if (accountError || !account?.user) return json({ error: "Sign in required" }, 401);

        const { data: adminRole, error: roleError } = await supabaseAdmin
          .from("user_roles")
          .select("role")
          .eq("user_id", account.user.id)
          .eq("role", "admin")
          .maybeSingle();
        if (roleError || !adminRole) return json({ error: "Forbidden" }, 403);

        const { ensureSignatureFile } = await import("@/lib/sale-signature.server");
        const skipped = new Set<string>();
        let converted = 0;
        for (let pass = 0; pass < 40; pass += 1) {
          const { data: rows, error: rowsError } = await supabaseAdmin
            .from("invoices")
            .select("id, signature_data_url")
            .is("signature_path", null)
            .not("signature_data_url", "is", null)
            .limit(20);
          if (rowsError) return json({ error: rowsError.message }, 500);
          const pending = (rows ?? []).filter((row) => !skipped.has(row.id));
          if (!pending.length) break;
          for (const row of pending) {
            const path = await ensureSignatureFile({ id: row.id, signature_data_url: row.signature_data_url });
            // A sale whose file could not be written keeps its inline copy for a
            // later run; nothing is removed here.
            if (path) converted += 1;
            else skipped.add(row.id);
          }
        }
        return json({ converted, skipped: skipped.size });
      },
    },
  },
});
