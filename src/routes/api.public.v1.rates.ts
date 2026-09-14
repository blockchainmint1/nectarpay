// Live crypto rates used for invoice pricing.
// GET /api/public/v1/rates            Bearer sk_live_…
// GET /api/public/v1/rates?amount=25  -> adds a converted crypto amount per chain

import { createFileRoute } from "@tanstack/react-router";

import { apiJson, apiPreflight } from "@/lib/public-api";

export const Route = createFileRoute("/api/public/v1/rates")({
  server: {
    handlers: {
      OPTIONS: async () => apiPreflight(),
      GET: async ({ request }) => {
        try {
          const { authenticateApiKey } = await import("@/lib/api-key-auth.server");
          const auth = await authenticateApiKey(request);
          if ("error" in auth) return auth.error;
          const { supabaseAdmin } = auth;

          const url = new URL(request.url);
          const amountRaw = url.searchParams.get("amount");
          const amount = amountRaw == null ? null : Number(amountRaw);
          if (amount != null && (!Number.isFinite(amount) || amount <= 0)) {
            return apiJson({ error: "`amount` must be a positive number." }, 400);
          }

          const { data: rows, error } = await supabaseAdmin
            .from("rates_cache")
            .select("chain, fiat, rate, fetched_at")
            .eq("fiat", "USD");
          if (error) return apiJson({ error: error.message }, 500);

          const rates = (rows ?? []).map((r) => ({
            chain: r.chain,
            fiat: r.fiat,
            rate: Number(r.rate),
            fetched_at: r.fetched_at,
            ...(amount != null ? { crypto_amount: Number(r.rate) > 0 ? amount / Number(r.rate) : null } : {}),
          }));

          // Stablecoins are pegged at $1 by the conversion layer, not cached.
          const stables = ["USDC", "USDT", "TSD"].map((symbol) => ({
            token: symbol,
            fiat: "USD",
            rate: 1,
            ...(amount != null ? { crypto_amount: amount } : {}),
          }));

          return apiJson({ fiat: "USD", amount, rates, stablecoins: stables });
        } catch (err) {
          return apiJson({ error: err instanceof Error ? err.message : "Server error" }, 500);
        }
      },
    },
  },
});
