import { createFileRoute } from "@tanstack/react-router";
import latestApk from "@/assets/nectar-pos-latest.apk.asset.json";

/**
 * Short, memorable URL for sideloading the POS APK onto a terminal.
 *   app.nectar-pay.com/pos-apk  → redirects to the latest signed APK
 *
 * The current build is hosted on the Lovable CDN (immutable URL, no auth,
 * works from any terminal browser). If a newer build is published to the
 * `pos_releases` table by CI, that wins and we mint a short-lived signed URL
 * from the private storage bucket instead.
 */
export const Route = createFileRoute("/pos-apk")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin;

        // Prefer a CI-published release if one exists and is newer than the
        // pinned CDN build.
        if (process.env.SUPABASE_URL) {
          try {
            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
            const { data: rel } = await supabaseAdmin
              .from("pos_releases")
              .select("apk_path, version, published_at")
              .order("published_at", { ascending: false })
              .limit(1)
              .maybeSingle();

            if (rel && new Date(rel.published_at ?? 0).getTime() > PINNED_PUBLISHED_AT) {
              const [bucket, ...rest] = rel.apk_path.split("/");
              const { data: signed } = await supabaseAdmin.storage
                .from(bucket)
                .createSignedUrl(rest.join("/"), 300, {
                  download: `nectar-pos-${rel.version}.apk`,
                });
              if (signed?.signedUrl) {
                return new Response(null, {
                  status: 302,
                  headers: { Location: signed.signedUrl, "Cache-Control": "no-store" },
                });
              }
            }
          } catch {
            // fall through to the pinned CDN build
          }
        }

        return new Response(null, {
          status: 302,
          headers: {
            Location: `${origin}${latestApk.url}`,
            "Cache-Control": "no-store",
          },
        });
      },
    },
  },
});

const PINNED_PUBLISHED_AT = new Date(latestApk.created_at).getTime();
