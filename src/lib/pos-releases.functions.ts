import { createServerFn } from "@tanstack/react-start";

/**
 * Public lookup for the latest signed POS APK metadata. Reads via the
 * admin client because the bucket is private — the response only exposes
 * safe fields (version, download link, checksum).
 */
export const getLatestPosRelease = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data, error } = await supabaseAdmin
    .from("pos_releases")
    .select("version, apk_path, sha256, published_at, notes")
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    return { version: null, url: null, sha256: null, publishedAt: null, notes: null };
  }

  // Use the short public redirect route — it signs on demand.
  return {
    version: data.version,
    url: "/pos-apk",
    sha256: data.sha256,
    publishedAt: data.published_at,
    notes: data.notes ?? null,
  };
});
