import { createFileRoute } from "@tanstack/react-router";
import { pollRates } from "@/lib/rates.functions";

export const Route = createFileRoute("/api/public/cron/rates")({
  server: {
    handlers: {
      POST: async () => {
        try {
          const result = await pollRates();
          return Response.json({ ok: true, ...result });
        } catch (e) {
          return Response.json(
            { ok: false, error: (e as Error).message },
            { status: 500 },
          );
        }
      },
      GET: async () => {
        // Allow manual trigger for debugging
        const result = await pollRates();
        return Response.json({ ok: true, ...result });
      },
    },
  },
});
