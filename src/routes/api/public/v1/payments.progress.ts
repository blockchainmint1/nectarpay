import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/v1/payments/progress")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { handlePaymentProgress } = await import("@/lib/payment-progress.server");
        return handlePaymentProgress(request);
      },
    },
  },
});