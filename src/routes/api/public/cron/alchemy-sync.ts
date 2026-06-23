// Periodic reconciliation: ensure every EVM address we've derived is
// subscribed on Alchemy's Address Activity webhooks across ETH, Base, BSC.
// Runs cheap (one list call per chain, then a single PATCH for any diff).
//
// Scheduled via pg_cron — see migrations for the schedule. The cron call
// supplies an empty body. Manual GET is also supported for debugging.

import { createFileRoute } from "@tanstack/react-router";
import { reconcileAllEvmChains } from "@/lib/alchemy-notify.server";

export const Route = createFileRoute("/api/public/cron/alchemy-sync")({
  server: {
    handlers: {
      POST: async () => {
        if (!process.env.ALCHEMY_AUTH_TOKEN) {
          return Response.json(
            { ok: false, error: "ALCHEMY_AUTH_TOKEN not configured" },
            { status: 503 },
          );
        }
        try {
          const results = await reconcileAllEvmChains();
          return Response.json({ ok: true, results });
        } catch (e) {
          return Response.json(
            { ok: false, error: (e as Error).message },
            { status: 500 },
          );
        }
      },
      GET: async () => {
        if (!process.env.ALCHEMY_AUTH_TOKEN) {
          return Response.json(
            { ok: false, error: "ALCHEMY_AUTH_TOKEN not configured" },
            { status: 503 },
          );
        }
        const results = await reconcileAllEvmChains();
        return Response.json({ ok: true, results });
      },
    },
  },
});
