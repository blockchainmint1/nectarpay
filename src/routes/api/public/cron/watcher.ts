import { createFileRoute } from "@tanstack/react-router";
import { runWatcherTick } from "@/lib/watcher.functions";
import { requireCronAuth } from "@/lib/cron-auth.server";

export const Route = createFileRoute("/api/public/cron/watcher")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const unauthorized = await requireCronAuth(request);
        if (unauthorized) return unauthorized;
        try {
          const results = await runWatcherTick();
          // Refresh HME Give's church list every 5 minutes (keeps last good list on failure).
          try { const { syncHmeGive } = await import("@/lib/hme-give-registry.server"); await syncHmeGive(300); } catch { /* keep backup */ }
          return Response.json({ ok: true, results });
        } catch (e) {
          return Response.json(
            { ok: false, error: (e as Error).message },
            { status: 500 },
          );
        }
      },
      GET: async ({ request }) => {
        const unauthorized = await requireCronAuth(request);
        if (unauthorized) return unauthorized;
        const results = await runWatcherTick();
        return Response.json({ ok: true, results });
      },
    },
  },
});
