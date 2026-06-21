// Public asset: serves the vanilla payHME JS SDK at /sdk/payhme.js with
// long cache + permissive CORS so any merchant site can <script src> it.

import { createFileRoute } from "@tanstack/react-router";
import { PAYHME_SDK_SOURCE } from "@/lib/sdk-source";

export const Route = createFileRoute("/sdk/payhme[.]js")({
  server: {
    handlers: {
      GET: async () =>
        new Response(PAYHME_SDK_SOURCE, {
          status: 200,
          headers: {
            "Content-Type": "application/javascript; charset=utf-8",
            "Cache-Control": "public, max-age=300, s-maxage=3600",
            "Access-Control-Allow-Origin": "*",
            "X-Content-Type-Options": "nosniff",
          },
        }),
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        }),
    },
  },
});
