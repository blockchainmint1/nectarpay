import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/dev-signup-email-sample")({
  server: {
    handlers: {
      POST: async () => {
        const [{ enqueueAppEmail }, { renderAdminAlertEmail }] = await Promise.all([
          import("@/lib/email/enqueue.server"),
          import("@/lib/notify-events.functions"),
        ]);

        const rows = [
          { label: "Name", value: "Isaac Rivas" },
          { label: "Email", value: "isaac.rivas99@gmail.com" },
          { label: "Sign-in method", value: "Google" },
          { label: "Email verified", value: "Yes" },
          { label: "Account type", value: "Standard" },
          { label: "Created", value: "Sep 17, 2026, 10:13 PM UTC" },
          { label: "User ID", value: "b5cadb49-9c4d-41b6-bb04-a5d7a0d39c7d" },
        ];
        const result = await enqueueAppEmail({
          to: "bobby@honest.money",
          subject: "Sample · New signup: Isaac Rivas",
          html: renderAdminAlertEmail(
            "Someone new joined NectarPay",
            "Isaac Rivas just created an account.",
            rows,
            "https://app.nectar-pay.com/admin",
            "View in admin",
          ),
          text: ["Isaac Rivas just created an account.", ...rows.map(({ label, value }) => `${label}: ${value}`)].join("\n"),
          label: "admin-notify-signup-sample",
          idempotencyKey: `signup-sample-${Date.now()}`,
        });

        return Response.json(result, { status: result.ok ? 200 : 500 });
      },
    },
  },
});