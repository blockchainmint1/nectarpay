import { createFileRoute } from "@tanstack/react-router";

// The HME Give list feed is disconnected (Give is managed in Admin → Wallets &
// Give), so this old update hook does nothing and makes no outbound calls.
export const Route = createFileRoute("/api/public/hooks/hme-give")({
  server: {
    handlers: {
      POST: async () => Response.json({ ok: false, error: "HME Give list is disconnected" }, { status: 410 }),
    },
  },
});
