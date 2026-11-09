// Dispatches Telegram alerts for any new chain_config_audit rows that haven't
// been notified yet. Called from the watcher cron tick.

import { notifyUser } from "@/lib/notify.server";

function mask(s: string | null | undefined): string {
  const v = (s ?? "").trim();
  if (!v) return "(empty)";
  if (v.length <= 12) return v;
  return `${v.slice(0, 8)}…${v.slice(-6)}`;
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
    .select("id, store_id, chain, action, old_xpub, new_xpub, old_xpub_or_address, new_xpub_or_address, created_at")
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
      const verb = r.action === "insert" ? "set" : "CHANGED";
      const subject = `⚠️ ${chainLabel} xpub ${verb} on "${owner.name}"`;
      const oldVal = r.old_xpub ?? r.old_xpub_or_address;
      const newVal = r.new_xpub ?? r.new_xpub_or_address;
      const lines = [
        `Store: ${owner.name}`,
        `Chain: ${chainLabel}`,
        `Action: ${r.action}`,
      ];
      if (r.action === "update") lines.push(`Previous: ${mask(oldVal)}`);
      lines.push(`New: ${mask(newVal)}`);
      lines.push("");
      lines.push("If this wasn't you, sign in immediately and revert it.");

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
