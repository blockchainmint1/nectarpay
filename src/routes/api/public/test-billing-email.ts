import { createFileRoute } from "@tanstack/react-router";
import {
  enqueueAppEmail,
  renderBillingAlertEmail,
} from "@/lib/email/enqueue.server";

export const Route = createFileRoute("/api/public/test-billing-email")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const host = new URL(request.url).hostname;
        if (host !== "localhost" && host !== "127.0.0.1") {
          return new Response("Not found", { status: 404 });
        }

        const subject = "You’re all set for another month!";
        const text = [
          "Your NectarPay Merchant plan renewed successfully.",
          "Monthly price: $29.00",
          "TXC charged: 290.00000000 TXC",
          "TXC balance: 1,210.00000000 TXC",
          "Next renewal: October 21, 2026",
        ].join("\n");
        const html = renderBillingAlertEmail({
          status: "renewed",
          planName: "Merchant",
          priceUsd: "$29.00",
          txcCharged: "290.00000000 TXC",
          txcBalance: "1,210.00000000 TXC",
          nextRenewal: "October 21, 2026",
        });
        const result = await enqueueAppEmail({
          to: "bobby@honest.money",
          subject,
          html,
          text,
          label: "plan_renewed_sample",
          idempotencyKey: `billing-renewal-sample-${Date.now()}`,
        });

        return Response.json(result, { status: result.ok ? 200 : 500 });
      },
    },
  },
});