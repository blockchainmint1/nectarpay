import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const Query = z.object({
  since: z.string().datetime({ offset: true }).optional(),
});

// Public merchant directory feed. Read-only, no auth: carries only what merchants chose to publish.
export const Route = createFileRoute("/api/public/v1/directory")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        const params = Object.fromEntries(new URL(request.url).searchParams);
        const parsed = Query.safeParse(params);
        if (!parsed.success) {
          return Response.json(
            { error: { code: "invalid_since", message: "since must be an ISO-8601 timestamp, e.g. 2026-10-26T00:00:00Z" } },
            { status: 400, headers: CORS },
          );
        }
        try {
          const { loadDirectory } = await import("@/lib/directory.server");
          const feed = await loadDirectory(parsed.data.since ?? null);
          return Response.json(
            { ...feed, count: feed.stores.length, source: "https://app.nectar-pay.com/directory" },
            { headers: { ...CORS, "Cache-Control": "public, max-age=300" } },
          );
        } catch (e) {
          console.error("[directory] feed failed", e);
          return Response.json({ error: { code: "unavailable", message: "Directory temporarily unavailable" } }, { status: 503, headers: CORS });
        }
      },
    },
  },
});
