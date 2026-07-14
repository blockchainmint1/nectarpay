import { createFileRoute } from "@tanstack/react-router";

// Server-side redirect for outbound Terminal Kit purchases at blockchainmint.com.
//
// Why this route exists:
// - We land affiliate traffic here (us, mineTXC, IDMC — shared code namespace).
// - The qualifying purchase happens on blockchainmint.com.
// - To keep attribution across the hop, we read the nectar_ref cookie set by
//   src/lib/affiliate.ts and append ?ref=<code> to the BM URL. We also log the
//   click to affiliate_clickouts so we own our own receipt even if BM drops the
//   param.

const BM_URL =
  "https://blockchainmint.com/buy/nectar-pay-mobile-pos-terminal?to=cart&variant=40cc988e-8a2c-4b39-95af-75bc57024301&clear=1";

const CODE_RE = /^[A-Za-z0-9_-]{1,64}$/;

function readCookie(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) {
      try {
        return decodeURIComponent(rest.join("="));
      } catch {
        return null;
      }
    }
  }
  return null;
}

export const Route = createFileRoute("/go/kit")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        // Explicit override wins (e.g. shared link with ?r=CODE).
        const explicit = url.searchParams.get("r");
        const cookie = readCookie(request.headers.get("cookie"), "nectar_ref");
        const raw = explicit || cookie || "";
        const code = CODE_RE.test(raw) ? raw : null;

        const target = new URL(BM_URL);
        if (code) {
          target.searchParams.set("ref", code);
          target.searchParams.set("utm_source", "nectarpay");
          target.searchParams.set("utm_medium", "affiliate");
          target.searchParams.set("utm_campaign", code);
        }

        // Fire-and-forget log — never block the redirect.
        if (code) {
          try {
            const { supabaseAdmin } = await import(
              "@/integrations/supabase/client.server"
            );
            void supabaseAdmin.from("affiliate_clickouts").insert({
              affiliate_id: code,
              target: "kit",
              target_url: target.toString(),
              user_agent: request.headers.get("user-agent")?.slice(0, 500) ?? null,
              referrer: request.headers.get("referer")?.slice(0, 500) ?? null,
            });
          } catch {
            /* ignore */
          }
        }

        return new Response(null, {
          status: 302,
          headers: {
            Location: target.toString(),
            "Cache-Control": "no-store",
          },
        });
      },
    },
  },
});
