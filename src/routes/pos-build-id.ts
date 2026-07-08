import { createFileRoute } from "@tanstack/react-router";

declare const __BUILD_ID__: string;

/**
 * Returns the BUILD_ID of the *currently deployed* server bundle. The
 * POS WebView polls this and compares against its own baked-in
 * __BUILD_ID__ so we can detect a stale WebView cache even though
 * capacitor's server.url points at the live site.
 */
export const Route = createFileRoute("/pos-build-id")({
  server: {
    handlers: {
      GET: async () => {
        return new Response(
          JSON.stringify({ buildId: __BUILD_ID__ }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "no-store, no-cache, must-revalidate",
              "Access-Control-Allow-Origin": "*",
            },
          },
        );
      },
    },
  },
});
