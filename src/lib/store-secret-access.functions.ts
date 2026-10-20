import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/** Privileged secret operations must check authority, not mere row visibility. */
export async function assertStoreSecretAccess(
  supabase: SupabaseClient<Database>, storeId: string,
): Promise<void> {
  const { data, error } = await supabase.rpc("store_access_level", { _store_id: storeId });
  if (error || Number(data ?? 0) < 3) throw new Error("Full store access required.");
}