// Reusable hosted payment links (the /t/{slug} pages).
// GET  /api/public/v1/links   -> list this store's links
// POST /api/public/v1/links   -> create one
// Bearer sk_live_…

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { apiJson, apiPreflight } from "@/lib/public-api";

const Body = z.object({
  slug: z
    .string()
    .min(2)
    .max(64)
    .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, "slug must be lowercase letters, numbers and dashes")
    .optional(),
  title: z.string().max(120).optional(),
  subtitle: z.string().max(240).optional(),
  cta_label: z.string().max(40).optional(),
  currency: z.string().min(3).max(8).optional(),
  preset_amounts: z.array(z.number().positive().max(1_000_000)).max(8).optional(),
  allow_custom_amount: z.boolean().optional(),
  min_amount: z.number().positive().max(1_000_000).optional(),
  max_amount: z.number().positive().max(1_000_000).optional(),
  is_donation: z.boolean().optional(),
});

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export const Route = createFileRoute("/api/public/v1/links")({
  server: {
    handlers: {
      OPTIONS: async () => apiPreflight(),

      GET: async ({ request }) => {
        try {
          const { authenticateApiKey } = await import("@/lib/api-key-auth.server");
          const auth = await authenticateApiKey(request);
          if ("error" in auth) return auth.error;
          const { keyRow, supabaseAdmin } = auth;

          const { data: rows, error } = await supabaseAdmin
            .from("public_terminals")
            .select(
              "slug, title, subtitle, cta_label, currency, preset_amounts, allow_custom_amount, min_amount, max_amount, is_donation, active, view_count, created_at",
            )
            .eq("store_id", keyRow.store_id)
            .order("created_at", { ascending: false })
            .limit(200);
          if (error) return apiJson({ error: error.message }, 500);

          const origin = new URL(request.url).origin;
          return apiJson({
            links: (rows ?? []).map((r) => ({
              ...r,
              preset_amounts: (r.preset_amounts ?? []).map(Number),
              min_amount: Number(r.min_amount),
              max_amount: Number(r.max_amount),
              url: `${origin}/t/${r.slug}`,
            })),
          });
        } catch (err) {
          return apiJson({ error: err instanceof Error ? err.message : "Server error" }, 500);
        }
      },

      POST: async ({ request }) => {
        try {
          const { authenticateApiKey } = await import("@/lib/api-key-auth.server");
          const auth = await authenticateApiKey(request);
          if ("error" in auth) return auth.error;
          const { keyRow, supabaseAdmin } = auth;

          const raw = await request.json().catch(() => null);
          const parsed = Body.safeParse(raw ?? {});
          if (!parsed.success) return apiJson({ error: parsed.error.errors[0]?.message ?? "Invalid body" }, 400);
          const body = parsed.data;

          const base = body.slug ?? slugify(body.title ?? "pay");
          if (base.length < 2) return apiJson({ error: "Could not build a slug — pass `slug`." }, 400);

          let slug = base;
          for (let i = 0; i < 5; i++) {
            const { data: taken } = await supabaseAdmin
              .from("public_terminals")
              .select("id")
              .eq("slug", slug)
              .maybeSingle();
            if (!taken) break;
            if (body.slug) return apiJson({ error: `Slug '${body.slug}' is already taken.` }, 409);
            slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
          }

          const minAmount = body.min_amount ?? 1;
          const maxAmount = body.max_amount ?? 100_000;
          if (minAmount > maxAmount) return apiJson({ error: "min_amount must be <= max_amount." }, 400);

          const { data: inserted, error } = await supabaseAdmin
            .from("public_terminals")
            .insert({
              store_id: keyRow.store_id,
              slug,
              title: body.title ?? null,
              subtitle: body.subtitle ?? null,
              cta_label: body.cta_label ?? null,
              currency: body.currency ?? null,
              preset_amounts: body.preset_amounts ?? [],
              allow_custom_amount: body.allow_custom_amount ?? true,
              min_amount: minAmount,
              max_amount: maxAmount,
              is_donation: body.is_donation ?? false,
              active: true,
            })
            .select("slug, title, subtitle, cta_label, currency, preset_amounts, allow_custom_amount, min_amount, max_amount, is_donation, active, created_at")
            .single();
          if (error || !inserted) return apiJson({ error: error?.message ?? "Insert failed." }, 500);

          const origin = new URL(request.url).origin;
          return apiJson(
            {
              ...inserted,
              preset_amounts: (inserted.preset_amounts ?? []).map(Number),
              min_amount: Number(inserted.min_amount),
              max_amount: Number(inserted.max_amount),
              url: `${origin}/t/${inserted.slug}`,
            },
            201,
          );
        } catch (err) {
          return apiJson({ error: err instanceof Error ? err.message : "Server error" }, 500);
        }
      },
    },
  },
});
