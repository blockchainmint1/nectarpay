/**
 * Admin account deactivation ("soft delete").
 *
 * Goal: make the account look and behave as if it were deleted, and wipe the
 * personal info we could use to contact the person again — while keeping all
 * historical sales data (invoices, transactions, stores) intact for records.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const BAN_FOREVER = "876000h"; // ~100 years

export type DeactivationResult = {
  ok: true;
  user_id: string;
  stores_deactivated: number;
  terminals_revoked: number;
  api_keys_revoked: number;
  leads_scrubbed: number;
};

export async function deactivateAccount(
  userId: string,
  reason: string | null,
  performedBy: string,
): Promise<DeactivationResult> {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("email")
    .eq("user_id", userId)
    .maybeSingle();
  const email = profile?.email ?? null;

  // 1. Stop all future contact: suppress the address and kill notifications.
  if (email) {
    await supabaseAdmin
      .from("suppressed_emails")
      .upsert(
        {
          email: email.toLowerCase(),
          reason: "unsubscribe",
          metadata: { source: "account_deactivated" },
        },
        { onConflict: "email" },
      );
  }
  await supabaseAdmin
    .from("notification_prefs")
    .update({
      email_enabled: false,
      telegram_enabled: false,
      email_address: null,
      telegram_chat_id: null,
      telegram_username: null,
    })
    .eq("user_id", userId);

  // 2. Scrub CRM leads tied to this address so reps stop chasing them.
  let leadsScrubbed = 0;
  if (email) {
    const { data: leads } = await supabaseAdmin
      .from("leads")
      .update({
        status: "closed_lost",
        name: "[deleted]",
        phone: null,
        telegram: null,
        message: null,
        admin_notes: "Account deactivated by admin — contact details removed.",
      })
      .ilike("email", email)
      .select("id");
    leadsScrubbed = leads?.length ?? 0;
  }

  // 3. Wipe personal info from the public profile (history stays keyed by id).
  await supabaseAdmin
    .from("profiles")
    .update({
      email: null,
      full_name: "[deleted account]",
      avatar_url: null,
      deactivated_at: new Date().toISOString(),
      deactivated_by: performedBy,
      deactivated_reason: reason,
    })
    .eq("user_id", userId);

  // 4. Take their stores / terminals / API keys offline. Sales rows untouched.
  const { data: stores } = await supabaseAdmin
    .from("stores")
    .update({ deactivated_at: new Date().toISOString() })
    .eq("owner_id", userId)
    .select("id");
  const storeIds = (stores ?? []).map((s) => s.id);

  let terminalsRevoked = 0;
  let keysRevoked = 0;
  if (storeIds.length) {
    const { data: terms } = await supabaseAdmin
      .from("terminals")
      .update({ revoked_at: new Date().toISOString() })
      .in("store_id", storeIds)
      .is("revoked_at", null)
      .select("id");
    terminalsRevoked = terms?.length ?? 0;

    const { data: keys } = await supabaseAdmin
      .from("api_keys")
      .update({ revoked_at: new Date().toISOString() })
      .in("store_id", storeIds)
      .is("revoked_at", null)
      .select("id");
    keysRevoked = keys?.length ?? 0;
  }

  // 5. Block sign-in so the account behaves like it no longer exists.
  await supabaseAdmin.auth.admin.updateUserById(userId, { ban_duration: BAN_FOREVER });

  await supabaseAdmin.from("account_deactivations").insert({
    user_id: userId,
    action: "deactivate",
    reason,
    performed_by: performedBy,
  });

  return {
    ok: true,
    user_id: userId,
    stores_deactivated: storeIds.length,
    terminals_revoked: terminalsRevoked,
    api_keys_revoked: keysRevoked,
    leads_scrubbed: leadsScrubbed,
  };
}

export async function reactivateAccount(
  userId: string,
  reason: string | null,
  performedBy: string,
) {
  const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
  const email = authUser?.user?.email ?? null;

  await supabaseAdmin.auth.admin.updateUserById(userId, { ban_duration: "none" });

  await supabaseAdmin
    .from("profiles")
    .update({
      email,
      full_name: authUser?.user?.user_metadata?.["full_name"] ?? null,
      deactivated_at: null,
      deactivated_by: null,
      deactivated_reason: null,
    })
    .eq("user_id", userId);

  await supabaseAdmin
    .from("stores")
    .update({ deactivated_at: null })
    .eq("owner_id", userId);

  if (email) {
    await supabaseAdmin.from("suppressed_emails").delete().ilike("email", email);
  }

  await supabaseAdmin.from("account_deactivations").insert({
    user_id: userId,
    action: "reactivate",
    reason,
    performed_by: performedBy,
  });

  return { ok: true as const, user_id: userId, email_restored: Boolean(email) };
}

export async function listAccountDeactivationHistory(userId: string) {
  const { data } = await supabaseAdmin
    .from("account_deactivations")
    .select("id, action, reason, performed_by, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

/**
 * Merchant self-service: close one store.
 * Takes the store offline (terminals, API keys, share links, chains) and
 * clears its public listing / receipt branding. Invoices and transactions
 * are left untouched for the records.
 */
export async function closeStoreForOwner(userId: string, storeId: string) {
  const { data: store } = await supabaseAdmin
    .from("stores")
    .select("id, owner_id, deactivated_at")
    .eq("id", storeId)
    .maybeSingle();
  if (!store || store.owner_id !== userId) throw new Error("Store not found.");
  if (store.deactivated_at) return { ok: true as const, store_id: storeId, already_closed: true };

  const now = new Date().toISOString();

  await supabaseAdmin
    .from("stores")
    .update({
      deactivated_at: now,
      listing_visibility: "hidden",
      webhook_url: null,
      business_address: null,
      business_lat: null,
      business_lng: null,
      business_description: null,
      business_logo_url: null,
      receipt_logo_url: null,
      receipt_address: null,
      receipt_footer: null,
      receipt_tax_id: null,
    })
    .eq("id", storeId);

  const [terms, keys] = await Promise.all([
    supabaseAdmin
      .from("terminals")
      .update({ revoked_at: now })
      .eq("store_id", storeId)
      .is("revoked_at", null)
      .select("id"),
    supabaseAdmin
      .from("api_keys")
      .update({ revoked_at: now })
      .eq("store_id", storeId)
      .is("revoked_at", null)
      .select("id"),
  ]);

  await supabaseAdmin.from("public_terminals").update({ active: false }).eq("store_id", storeId);
  await supabaseAdmin.from("chain_configs").update({ enabled: false }).eq("store_id", storeId);

  return {
    ok: true as const,
    store_id: storeId,
    already_closed: false,
    terminals_revoked: terms.data?.length ?? 0,
    api_keys_revoked: keys.data?.length ?? 0,
  };
}
