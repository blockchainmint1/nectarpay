// Shared email step-up check for anything that replaces a store's payout keys.
import { createHash, timingSafeEqual } from "crypto";

export const WALLET_LINK_ACTION = "wallet_link";
const MAX_ATTEMPTS = 5;

function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

/** Verify + burn the latest emailed code for this user/store. Throws on failure. */
export async function consumeWalletLinkChallenge(userId: string, storeId: string, code: string | undefined) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: challenge } = await supabaseAdmin
    .from("sensitive_action_codes")
    .select("id, code_hash, expires_at, attempts, consumed_at")
    .eq("user_id", userId)
    .eq("store_id", storeId)
    .eq("action", WALLET_LINK_ACTION)
    .is("consumed_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!challenge) throw new Error("Request a new email confirmation code.");
  if (new Date(challenge.expires_at).getTime() < Date.now()) throw new Error("That code expired — request a new one.");
  if (challenge.attempts >= MAX_ATTEMPTS) {
    await supabaseAdmin.from("sensitive_action_codes").update({ consumed_at: new Date().toISOString() }).eq("id", challenge.id);
    throw new Error("Too many wrong codes — request a new one.");
  }
  const a = Buffer.from(challenge.code_hash);
  const b = Buffer.from(sha256(code ?? ""));
  if (!code || a.length !== b.length || !timingSafeEqual(a, b)) {
    await supabaseAdmin.from("sensitive_action_codes").update({ attempts: challenge.attempts + 1 }).eq("id", challenge.id);
    throw new Error("Incorrect code.");
  }
  // Conditional burn: a parallel request using the same code loses.
  const { data: burned } = await supabaseAdmin
    .from("sensitive_action_codes")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", challenge.id)
    .is("consumed_at", null)
    .select("id")
    .maybeSingle();
  if (!burned) throw new Error("That code was already used — request a new one.");
}
