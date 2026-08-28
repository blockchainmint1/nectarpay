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
        { email: email.toLowerCase(), reason: "account_deactivated" },
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
