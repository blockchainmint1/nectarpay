import { createFileRoute } from "@tanstack/react-router";

// Public, read-only image proxy for store logos (logos appear on the public map and receipts).
// Only serves objects from the store-logos bucket; path must be "<store-uuid>/<file>".
const PATH_RE = /^[0-9a-f-]{36}\/[A-Za-z0-9._-]{1,80}$/i;

export const Route = createFileRoute("/api/public/store-logo/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const path = params._splat ?? "";
        if (!PATH_RE.test(path)) return new Response("Not found", { status: 404 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.storage.from("store-logos").download(path);
        if (error || !data) return new Response("Not found", { status: 404 });
        // Raster images only — never serve SVG/HTML from our own origin.
        if (!["image/png", "image/jpeg", "image/webp"].includes(data.type)) {
          return new Response("Unsupported", { status: 415 });
        }
        return new Response(data, {
          headers: {
            "Content-Type": data.type || "image/png",
            "Cache-Control": "public, max-age=86400",
            "X-Content-Type-Options": "nosniff",
          },
        });
      },
    },
  },
});
