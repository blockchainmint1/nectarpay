// Public, CORS-enabled live stats feed.
// Consumed by the marketing site (nectar-pay.com/live) and any other
// external surface that wants the network numbers. Read-only, no PII.

import { createFileRoute } from "@tanstack/react-router";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

export const Route = createFileRoute("/api/public/v1/live-stats")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      GET: async () => {
        try {
          const { computeLiveStats } = await import("@/lib/live-stats.server");
          const stats = await computeLiveStats();
          return new Response(JSON.stringify(stats), {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "public, max-age=30, s-maxage=30",
              ...corsHeaders,
            },
          });
        } catch (error) {
          console.error("[live-stats] failed", error);
          return new Response(JSON.stringify({ error: "Failed to load live stats" }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }
      },
    },
  },
});
