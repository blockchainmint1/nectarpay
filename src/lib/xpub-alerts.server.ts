// Dispatches Telegram alerts for any new chain_config_audit rows that haven't
// been notified yet. Called from the watcher cron tick.

import { notifyUser } from "@/lib/notify.server";
import { KEY_COOL_OFF_HOURS } from "@/lib/chain-key-input";

function mask(s: string | null | undefined): string {
  const v = (s ?? "").trim();
  if (!v) return "(empty)";
  if (v.length <= 12) return v;
  return `${v.slice(0, 8)}…${v.slice(-6)}`;
}

/** Alert wording for wallet-key audit rows (immediate, scheduled, activated, cancelled). */
export function describeKeyChange(r: {
  chainLabel: string;
  storeName: string;
  action: string;
  source: string | null;
  oldVal: string | null;
  newVal: string | null;
  createdAt: string;
}): { subject: string; lines: string[] } {
  const base = [`Store: ${r.storeName}`, `Chain: ${r.chainLabel}`];
  if (r.action === "scheduled") {
    const at = new Date(new Date(r.createdAt).getTime() + KEY_COOL_OFF_HOURS * 3_600_000);
    return {
      subject: `⚠️ ${r.chainLabel} wallet key change REQUESTED on "${r.storeName}"`,
      lines: [...base, `Current: ${mask(r.oldVal)}`, `Requested: ${mask(r.newVal)}`,
        `Takes effect: ${at.toUTCString()} (sales keep paying the current wallet until then)`, "",
        "If this wasn't you, sign in now and press Cancel on the Wallets & Chains page."],
    };
  }
  if (r.action === "cancelled") {
    return {
      subject: `${r.chainLabel} wallet key change cancelled on "${r.storeName}"`,
      lines: [...base, `Kept: ${mask(r.oldVal)}`, `Cancelled: ${mask(r.newVal)}`],
    };
  }
  if (r.source === "scheduled_change_activated") {
    return {
      subject: `⚠️ ${r.chainLabel} wallet key change is now ACTIVE on "${r.storeName}"`,
      lines: [...base, `Previous: ${mask(r.oldVal)}`, `Now paying: ${mask(r.newVal)}`, "",
        "If this wasn't you, sign in immediately and change it back."],
    };
  }
  const verb = r.action === "insert" ? "set" : "CHANGED";
  const lines = [...base, `Action: ${r.action}`];
  if (r.action === "update") lines.push(`Previous: ${mask(r.oldVal)}`);
  lines.push(`New: ${mask(r.newVal)}`, "", "If this wasn't you, sign in immediately and revert it.");
  return { subject: `⚠️ ${r.chainLabel} xpub ${verb} on "${r.storeName}"`, lines };
}

let adminIdCache: string[] | null = null;
async function adminIds(): Promise<string[]> {
  if (adminIdCache) return adminIdCache;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("user_roles").select("user_id").eq("role", "admin");
  adminIdCache = Array.from(new Set((data ?? []).map((r) => r.user_id as string)));
  return adminIdCache;
}

export async function dispatchXpubChangeAlerts(): Promise<{ processed: number; sent: number }> {
  adminIdCache = null;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: rows, error } = await supabaseAdmin
    .from("chain_config_audit")
    .select("id, store_id, chain, action, source, old_xpub, new_xpub, old_xpub_or_address, new_xpub_or_address, created_at")
    .is("notified_at", null)
    .order("created_at", { ascending: true })
    .limit(50);

  if (error) throw new Error(error.message);
  if (!rows || rows.length === 0) return { processed: 0, sent: 0 };

  let sent = 0;

  // Cache store → owner lookup.
  const ownerCache = new Map<string, { ownerId: string; name: string } | null>();

  for (const r of rows) {
    let owner = ownerCache.get(r.store_id);
    if (owner === undefined) {
      const { data: store } = await supabaseAdmin
        .from("stores")
        .select("owner_id, name")
        .eq("id", r.store_id)
        .maybeSingle();
      owner = store ? { ownerId: store.owner_id, name: store.name } : null;
      ownerCache.set(r.store_id, owner);
    }

    if (owner) {
      const chainLabel = String(r.chain).toUpperCase();
      const { subject, lines } = describeKeyChange({
        chainLabel,
        storeName: owner.name,
        action: r.action,
        source: r.source,
        oldVal: r.old_xpub ?? r.old_xpub_or_address,
        newVal: r.new_xpub ?? r.new_xpub_or_address,
        createdAt: r.created_at,
      });

      const metadata = { store_id: r.store_id, chain: r.chain, action: r.action, audit_id: r.id };
      // Wallet-key changes can't be muted: the owner hears on every channel,
      // including their sign-in email, and platform admins get a copy.
      await notifyUser(owner.ownerId, {
        event: "security_xpub_change",
        subject,
        text: lines.join("\n"),
        storeId: r.store_id,
        force: true,
        metadata,
      });
      for (const adminId of await adminIds()) {
        if (adminId === owner.ownerId) continue;
        await notifyUser(adminId, {
          event: "security_xpub_change",
          subject: `[Admin copy] ${subject}`,
          text: lines.slice(0, -2).join("\n"),
          force: true,
          metadata: { ...metadata, admin_copy: true },
        });
      }
      sent++;
    }

    await supabaseAdmin
      .from("chain_config_audit")
      .update({ notified_at: new Date().toISOString() })
      .eq("id", r.id);
  }

  return { processed: rows.length, sent };
}
