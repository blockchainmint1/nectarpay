import { createFileRoute } from "@tanstack/react-router";

// Public, unauthenticated endpoint used by the landing page to increment
// affiliate click counts. The underlying SECURITY DEFINER RPC is not
// executable by `anon` — we call it here with the service-role client after
// validating the code shape.
const CODE_RE = /^[A-Za-z0-9_-]{1,64}$/;

export const Route = createFileRoute("/api/public/affiliate/click")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json().catch(() => null)) as
            | { code?: unknown }
            | null;
          const code = typeof body?.code === "string" ? body.code : "";
          if (!CODE_RE.test(code)) {
            return new Response("Bad Request", { status: 400 });
          }
          const { supabaseAdmin } = await import(
            "@/integrations/supabase/client.server"
          );
          await supabaseAdmin.rpc("increment_affiliate_click", { _code: code });
          return new Response("ok", { status: 200 });
        } catch {
          // Fire-and-forget; never leak details.
          return new Response("ok", { status: 200 });
        }
      },
    },
  },
});
