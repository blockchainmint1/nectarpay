import { createFileRoute } from "@tanstack/react-router";
import { runWatcherTick } from "@/lib/watcher.functions";

export const Route = createFileRoute("/api/public/cron/watcher")({
  server: {
    handlers: {
      POST: async () => {
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
      GET: async () => {
        const results = await runWatcherTick();
        return Response.json({ ok: true, results });
      },
    },
  },
});
