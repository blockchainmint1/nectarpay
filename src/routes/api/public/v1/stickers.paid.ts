import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/v1/stickers/paid")({
  server: { handlers: { POST: async ({ request }) => {
    const { handleStickerPartner } = await import("@/lib/sticker-partner.server");
    return handleStickerPartner(request, "paid");
  } } },
});