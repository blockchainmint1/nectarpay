import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/**
 * Short, memorable URL for sideloading the POS APK onto a terminal.
 *   nectar-pay.com/pos-apk  → streams the latest signed APK
 *
 * We keep the storage bucket private and mint a fresh signed URL on every
 * request, then 302 the client to it. That way the bucket policy stays
 * strict and we don't leak the storage path in caching layers.
 */
export const Route = createFileRoute("/pos-apk")({
  server: {
    handlers: {
      GET: async () => {
        const url = process.env.SUPABASE_URL;
        if (!url) return new Response("Not configured", { status: 503 });

        // Signed URLs require the admin client (bucket is private).
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: rel, error: relErr } = await supabaseAdmin
          .from("pos_releases")
          .select("apk_path, version")
          .order("published_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (relErr || !rel) {
          return new Response(
            "No POS build published yet — trigger a build from the pos-app branch or push a pos-v* tag.",
            { status: 404 },
          );
        }

        // apk_path is stored as `pos-releases/nectar-pos-<v>.apk` — strip the
        // bucket prefix for the storage signer.
        const [bucket, ...rest] = rel.apk_path.split("/");
        const objectPath = rest.join("/");

        const { data: signed, error: signErr } = await supabaseAdmin
          .storage
          .from(bucket)
          .createSignedUrl(objectPath, 300, {
            download: `nectar-pos-${rel.version}.apk`,
          });

        if (signErr || !signed?.signedUrl) {
          return new Response(`Failed to sign URL: ${signErr?.message ?? "unknown"}`, {
            status: 500,
          });
        }

        return new Response(null, {
          status: 302,
          headers: {
            Location: signed.signedUrl,
            "Cache-Control": "no-store",
          },
        });
      },
    },
  },
});

// Unused-import guard — keeps createClient reachable if we later switch back
// to the publishable client. Remove once behavior is stable.
void createClient;
void ({} as Database);
