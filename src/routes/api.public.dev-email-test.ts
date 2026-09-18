import { createFileRoute } from "@tanstack/react-router";

// Temporary manual test endpoint for previewing the payment notification email.
export const Route = createFileRoute("/api/public/dev-email-test")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const to = url.searchParams.get("to");
        if (!to) return new Response("missing to", { status: 400 });

        const { enqueueAppEmail, renderPaymentAlertEmail } = await import(
          "@/lib/email/enqueue.server"
        );
        const html = renderPaymentAlertEmail({
          status: "paid",
          storeName: "Blockchain Mint",
          invoiceId: "b4a76cce",
          invoiceUuid: "b4a76cce-4e1f-4019-8ad1-2b9d0d3cddf1",
          amountDue: "$20.00",
          amountReceived: "$20.00",
          paymentMethod: "USDC on ETH",
          orderId: "BM-10432",
        });

        const result = await enqueueAppEmail({
          to,
          subject: "You made a sale · $20.00 at Blockchain Mint",
          html,
          text: "Blockchain Mint received $20.00 (USDC on ETH).",
          label: "invoice_paid",
        });
        return Response.json(result);
      },
    },
  },
});
