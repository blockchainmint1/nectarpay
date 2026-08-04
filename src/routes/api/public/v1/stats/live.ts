// Public aggregate stats feed for the marketing site (nectar-pay.com/live).
//
// Aggregates only — no merchant names, owner emails, store IDs or wallet
// addresses are ever returned. Optional shared-key gating: if the
// STATS_SHARED_KEY env var is set, callers must send it as `x-stats-key`.
// When unset, the endpoint is open (it is aggregate-only data).

import { createFileRoute } from "@tanstack/react-router";

const ALLOWED_ORIGINS = new Set([
  "https://nectar-pay.com",
  "https://www.nectar-pay.com",
  "https://nectarpay.honest.money",
  "https://app.nectar-pay.com",
]);

function corsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin && ALLOWED_ORIGINS.has(origin) ? origin : "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-stats-key",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export const Route = createFileRoute("/api/public/v1/stats/live")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) =>
        new Response(null, { status: 204, headers: corsHeaders(request.headers.get("origin")) }),

      GET: async ({ request }) => {
        const cors = corsHeaders(request.headers.get("origin"));
        const requiredKey = process.env["STATS_SHARED_KEY"];

        if (requiredKey && request.headers.get("x-stats-key") !== requiredKey) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json", ...cors },
          });
        }

        try {
          const { computeLiveStats } = await import("@/lib/live-stats.server");
          const stats = await computeLiveStats();
          return new Response(JSON.stringify(stats), {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "public, max-age=30, s-maxage=30",
              ...cors,
            },
          });
        } catch (error) {
          console.error("[stats/live] failed", error);
          return new Response(JSON.stringify({ error: "Failed to load live stats" }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...cors },
          });
        }
      },
    },
  },
});
