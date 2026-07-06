import { createServerFn } from "@tanstack/react-start";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/**
 * Public lookup for the latest signed POS APK. Reads from the
 * `pos_releases` table (populated by the CI workflow) with a narrow public
 * SELECT policy — no PII, no service key needed.
 */
export const getLatestPosRelease = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );

  const { data, error } = await supabase
    .from("pos_releases")
    .select("version, apk_path, sha256, published_at, notes")
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    return { version: null, url: null, sha256: null, publishedAt: null, notes: null };
  }

  const url = `${process.env.SUPABASE_URL}/storage/v1/object/public/${data.apk_path}`;
  return {
    version: data.version,
    url,
    sha256: data.sha256,
    publishedAt: data.published_at,
    notes: data.notes ?? null,
  };
});
