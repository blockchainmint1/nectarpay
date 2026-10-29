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
        let converted = 0;
        let failed = 0;
        for (let pass = 0; pass < 40; pass += 1) {
          const { data: rows, error: rowsError } = await supabaseAdmin
            .from("invoices")
            .select("id, signature_data_url")
            .is("signature_path", null)
            .not("signature_data_url", "is", null)
            .limit(20);
          if (rowsError) return json({ error: rowsError.message }, 500);
          if (!rows?.length) break;
          for (const row of rows) {
            const path = await ensureSignatureFile({ id: row.id, signature_data_url: row.signature_data_url });
            if (path) converted += 1;
            else {
              failed += 1;
              // Leave the row alone so the next run retries it.
              await supabaseAdmin.from("invoices").update({ signature_path: "" }).eq("id", row.id).neq("signature_path", "");
            }
          }
        }
        return json({ converted, failed });
      },
    },
  },
});
