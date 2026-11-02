import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/v1/qr/lookup")({
  server: { handlers: { POST: async ({ request }) => {
    const { handleQrLookup } = await import("@/lib/qr-lookup.server");
    return handleQrLookup(request);
  } } },
});
