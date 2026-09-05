// Lightning settlement poller + merchant sweep.
// Schedule this alongside the on-chain watcher (every minute is plenty).
import { createFileRoute } from "@tanstack/react-router";
import { requireCronAuth } from "@/lib/cron-auth.server";

async function run() {
  const { runLightningWatcherTick, runLightningSweepTick } = await import(
    "@/lib/lightning.server"
  );
  const watch = await runLightningWatcherTick();
  const sweep = await runLightningSweepTick();
  return { watch, sweep };
}

export const Route = createFileRoute("/api/public/cron/lightning")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const unauthorized = requireCronAuth(request);
        if (unauthorized) return unauthorized;
        try {
          return Response.json({ ok: true, ...(await run()) });
        } catch (e) {
          return Response.json({ ok: false, error: (e as Error).message }, { status: 500 });
        }
      },
      GET: async ({ request }) => {
        const unauthorized = requireCronAuth(request);
        if (unauthorized) return unauthorized;
        try {
          return Response.json({ ok: true, ...(await run()) });
        } catch (e) {
          return Response.json({ ok: false, error: (e as Error).message }, { status: 500 });
        }
      },
    },
  },
});
