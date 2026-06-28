import { createFileRoute } from "@tanstack/react-router";
import { runWatcherTick } from "@/lib/watcher.functions";
import { requireCronAuth } from "@/lib/cron-auth.server";

export const Route = createFileRoute("/api/public/cron/watcher")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const unauthorized = requireCronAuth(request);
        if (unauthorized) return unauthorized;
        try {
          const results = await runWatcherTick();
          return Response.json({ ok: true, results });
        } catch (e) {
          return Response.json(
            { ok: false, error: (e as Error).message },
            { status: 500 },
          );
        }
      },
      GET: async ({ request }) => {
        const unauthorized = requireCronAuth(request);
        if (unauthorized) return unauthorized;
        const results = await runWatcherTick();
        return Response.json({ ok: true, results });
      },
    },
  },
});
