import { createFileRoute } from "@tanstack/react-router";

/**
 * Redeem a demo account's one-time self-destruct link.
 * Public by design: possession of the unguessable token is the authorization.
 */
export const Route = createFileRoute("/api/public/demo-reset")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let token = "";
        try {
          const body = (await request.json()) as { token?: string };
          token = typeof body.token === "string" ? body.token : "";
        } catch {
          token = "";
        }
        if (!token) {
          return Response.json({ ok: false, reason: "invalid" }, { status: 400 });
        }
        const { consumeDemoResetToken } = await import("@/lib/demo-account.server");
        const result = await consumeDemoResetToken(token);
        return Response.json(result, { status: result.ok ? 200 : 400 });
      },
    },
  },
});
