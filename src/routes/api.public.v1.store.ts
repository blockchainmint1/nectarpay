// Store profile + enabled payment networks for the authenticated API key.
// GET /api/public/v1/store   Bearer sk_live_…

import { createFileRoute } from "@tanstack/react-router";

import { apiJson, apiPreflight } from "@/lib/public-api";

export const Route = createFileRoute("/api/public/v1/store")({
  server: {
    handlers: {
      OPTIONS: async () => apiPreflight(),
      GET: async ({ request }) => {
        try {
          const { authenticateApiKey } = await import("@/lib/api-key-auth.server");
          const auth = await authenticateApiKey(request);
          if ("error" in auth) return auth.error;
          const { keyRow, supabaseAdmin } = auth;

          const { data: store } = await supabaseAdmin
            .from("stores")
            .select(
              "id, name, fiat_currency, invoice_ttl_seconds, tax_bps, tax_mode, business_logo_url, website, webhook_url, deactivated_at",
            )
            .eq("id", keyRow.store_id)
            .maybeSingle();
          if (!store || store.deactivated_at) return apiJson({ error: "Store not found." }, 404);

          const { data: chains } = await supabaseAdmin
            .from("chain_configs")
            .select("chain, network, enabled, stables, display_order")
            .eq("store_id", store.id)
            .eq("enabled", true)
            .order("display_order", { ascending: true });

          const { data: links } = await supabaseAdmin
            .from("public_terminals")
            .select("slug, title, active")
            .eq("store_id", store.id)
            .eq("active", true)
            .limit(50);

          const origin = new URL(request.url).origin;
          return apiJson({
            id: store.id,
            name: store.name,
            currency: store.fiat_currency,
            invoice_ttl_seconds: store.invoice_ttl_seconds,
            tax_bps: store.tax_bps,
            tax_mode: store.tax_mode,
            logo_url: store.business_logo_url,
            website: store.website,
            webhook_configured: Boolean(store.webhook_url),
            chains: (chains ?? []).map((c) => ({
              chain: c.chain,
              network: c.network,
              tokens: c.stables ?? [],
            })),
            payment_links: (links ?? []).map((l) => ({
              slug: l.slug,
              title: l.title,
              url: `${origin}/t/${l.slug}`,
            })),
          });
        } catch (err) {
          return apiJson({ error: err instanceof Error ? err.message : "Server error" }, 500);
        }
      },
    },
  },
});
