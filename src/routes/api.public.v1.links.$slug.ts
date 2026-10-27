// Manage one hosted payment link.
// GET    /api/public/v1/links/{slug}
// PATCH  /api/public/v1/links/{slug}   -> update fields / activate / deactivate
// DELETE /api/public/v1/links/{slug}   -> deactivate (link stops accepting payments)
// Bearer sk_live_…

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { apiJson, apiPreflight } from "@/lib/public-api";

const Patch = z.object({
  title: z.string().max(120).nullable().optional(),
  subtitle: z.string().max(240).nullable().optional(),
  cta_label: z.string().max(40).nullable().optional(),
  currency: z.string().min(3).max(8).nullable().optional(),
  preset_amounts: z.array(z.number().positive().max(1_000_000)).max(8).optional(),
  allow_custom_amount: z.boolean().optional(),
  min_amount: z.number().positive().max(1_000_000).optional(),
  max_amount: z.number().positive().max(1_000_000).optional(),
  is_donation: z.boolean().optional(),
  active: z.boolean().optional(),
});

const COLS =
  "slug, title, subtitle, cta_label, currency, preset_amounts, allow_custom_amount, min_amount, max_amount, is_donation, active, view_count, created_at";

function shape(r: Record<string, unknown>, origin: string) {
  return {
    ...r,
    preset_amounts: ((r["preset_amounts"] as number[]) ?? []).map(Number),
    min_amount: Number(r["min_amount"]),
    max_amount: Number(r["max_amount"]),
    url: `${origin}/t/${r["slug"] as string}`,
  };
}

export const Route = createFileRoute("/api/public/v1/links/$slug")({
  server: {
    handlers: {
      OPTIONS: async () => apiPreflight(),

      GET: async ({ request, params }) => {
        try {
          const { authenticateApiKey } = await import("@/lib/api-key-auth.server");
          const auth = await authenticateApiKey(request);
          if ("error" in auth) return auth.error;
          const { keyRow, supabaseAdmin } = auth;

          const { data: row } = await supabaseAdmin
            .from("public_terminals")
            .select(
              "slug, title, subtitle, cta_label, currency, preset_amounts, allow_custom_amount, min_amount, max_amount, is_donation, active, view_count, created_at, store_id",
            )
            .eq("slug", params.slug.toLowerCase())
            .maybeSingle();
          if (!row || row.store_id !== keyRow.store_id) return apiJson({ error: "Link not found." }, 404);

          const { store_id: _s, ...rest } = row;
          return apiJson(shape(rest as unknown as Record<string, unknown>, new URL(request.url).origin));
        } catch (err) {
          return apiJson({ error: err instanceof Error ? err.message : "Server error" }, 500);
        }
      },

      PATCH: async ({ request, params }) => {
        try {
          const { authenticateApiKey } = await import("@/lib/api-key-auth.server");
          const auth = await authenticateApiKey(request);
          if ("error" in auth) return auth.error;
          const { keyRow, supabaseAdmin } = auth;

          const raw = await request.json().catch(() => null);
          const parsed = Patch.safeParse(raw ?? {});
          if (!parsed.success) return apiJson({ error: parsed.error.errors[0]?.message ?? "Invalid body" }, 400);

          const { data: existing } = await supabaseAdmin
            .from("public_terminals")
            .select("id, store_id")
            .eq("slug", params.slug.toLowerCase())
            .maybeSingle();
          if (!existing || existing.store_id !== keyRow.store_id) return apiJson({ error: "Link not found." }, 404);

          const { data: updated, error } = await supabaseAdmin
            .from("public_terminals")
            .update(parsed.data)
            .eq("id", existing.id)
            .select(COLS)
            .single();
          if (error || !updated) return apiJson({ error: error?.message ?? "Update failed." }, 500);

          return apiJson(shape(updated as Record<string, unknown>, new URL(request.url).origin));
        } catch (err) {
          return apiJson({ error: err instanceof Error ? err.message : "Server error" }, 500);
        }
      },

      DELETE: async ({ request, params }) => {
        try {
          const { authenticateApiKey } = await import("@/lib/api-key-auth.server");
          const auth = await authenticateApiKey(request);
          if ("error" in auth) return auth.error;
          const { keyRow, supabaseAdmin } = auth;

          const { data: existing } = await supabaseAdmin
            .from("public_terminals")
            .select("id, store_id")
            .eq("slug", params.slug.toLowerCase())
            .maybeSingle();
          if (!existing || existing.store_id !== keyRow.store_id) return apiJson({ error: "Link not found." }, 404);

          const { error } = await supabaseAdmin
            .from("public_terminals")
            .update({ active: false })
            .eq("id", existing.id);
          if (error) return apiJson({ error: error.message }, 500);

          return apiJson({ ok: true, slug: params.slug.toLowerCase(), active: false });
        } catch (err) {
          return apiJson({ error: err instanceof Error ? err.message : "Server error" }, 500);
        }
      },
    },
  },
});
