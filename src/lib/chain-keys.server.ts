// Server-only gate shared by every path that can change a store's wallet keys
// (hand paste, Vault pairing, wallet-link). The DB trigger chain_key_cooloff
// then holds any REPLACEMENT key for KEY_COOL_OFF_HOURS.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export interface KeyChangeActor {
  store: { id: string; name: string; owner_id: string };
  /** A platform admin changing someone else's store: always needs the emailed code. */
  actingAsAdmin: boolean;
}

/**
 * Caller must have full access to the store (owner, store admin, or platform
 * admin) and, if they turned on 2-step login, have passed it this session.
 */
export async function authorizeKeyChange(
  supabase: SupabaseClient<Database>,
  userId: string,
  storeId: string,
): Promise<KeyChangeActor> {
  const { data: store, error } = await supabase
    .from("stores")
    .select("id, name, owner_id")
    .eq("id", storeId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!store) throw new Error("Store not found or not yours.");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rpc = supabase.rpc.bind(supabase) as any;
  const [{ data: level }, { data: mfaOk }, { data: isAdmin }] = await Promise.all([
    rpc("store_access_level", { _store_id: storeId }),
    rpc("mfa_ok", {}),
    rpc("has_role", { _user_id: userId, _role: "admin" }),
  ]);
  if (Number(level ?? 0) < 3) {
    throw new Error("Only the store owner or a full-access team member can change wallet keys.");
  }
  if (mfaOk !== true) {
    throw new Error("Finish your 2-step login (authenticator code) first, then try again.");
  }

  let actingAsAdmin = false;
  if (store.owner_id !== userId && isAdmin === true) {
    const { data: membership } = await supabase
      .from("store_members")
      .select("role")
      .eq("store_id", storeId)
      .eq("user_id", userId)
      .maybeSingle();
    actingAsAdmin = membership?.role !== "admin";
  }
  return { store, actingAsAdmin };
}
