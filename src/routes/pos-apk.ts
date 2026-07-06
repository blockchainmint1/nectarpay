import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/**
 * Short, memorable URL for sideloading the POS APK onto a terminal.
 *   nectar-pay.com/pos-apk  → 302 → https://<cloud>/storage/v1/object/public/pos-releases/nectar-pos-<v>.apk
 *
 * Terminals type this into their browser; keeping it short means the whole
 * install flow fits on one printed onboarding card.
 */
export const Route = createFileRoute("/pos-apk")({
  server: {
    handlers: {
      GET: async () => {
        const url = process.env.SUPABASE_URL;
        const key = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!url || !key) return new Response("Not configured", { status: 503 });

        const supabase = createClient<Database>(url, key, {
          auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
        });

        const { data, error } = await supabase
          .from("pos_releases")
          .select("apk_path")
          .order("published_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error || !data) {
          return new Response(
            "No POS build published yet. Check https://github.com/… for the latest artifact.",
            { status: 404 },
          );
        }

        return new Response(null, {
          status: 302,
          headers: {
            Location: `${url}/storage/v1/object/public/${data.apk_path}`,
            "Cache-Control": "public, max-age=60",
          },
        });
      },
    },
  },
});
