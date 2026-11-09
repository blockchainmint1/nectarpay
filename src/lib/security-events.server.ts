// Sends alerts for new security_events rows (written by DB triggers and the
// emailed-code lockout). Unmutable: owners and platform admins always hear.
import { notifyUser } from "@/lib/notify.server";
import { describeSecurityEvent, ownerShouldHear } from "@/lib/security-events";

export async function dispatchSecurityEvents(): Promise<{ processed: number }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: rows, error } = await supabaseAdmin
    .from("security_events")
    .select("id, kind, store_id, actor_id, detail, created_at")
    .is("notified_at", null)
    .order("created_at", { ascending: true })
    .limit(50);
  if (error) throw new Error(error.message);
  if (!rows?.length) return { processed: 0 };

  const { data: admins } = await supabaseAdmin.from("user_roles").select("user_id").eq("role", "admin");
  const adminIds = Array.from(new Set((admins ?? []).map((a) => a.user_id as string)));

  const emailCache = new Map<string, string | null>();
  const emailOf = async (id: string | null | undefined) => {
    if (!id) return null;
    if (!emailCache.has(id)) {
      const { data } = await supabaseAdmin.auth.admin.getUserById(id);
      emailCache.set(id, data?.user?.email ?? null);
    }
    return emailCache.get(id) ?? null;
  };

  for (const r of rows) {
    // Claim first so a parallel tick can't send twice.
    const { data: claimed } = await supabaseAdmin
      .from("security_events")
      .update({ notified_at: new Date().toISOString() })
      .eq("id", r.id)
      .is("notified_at", null)
      .select("id");
    if (!claimed?.length) continue;

    let store: { name: string; owner_id: string } | null = null;
    if (r.store_id) {
      const { data } = await supabaseAdmin.from("stores").select("name, owner_id").eq("id", r.store_id).maybeSingle();
      store = data ?? null;
    }
    const detail = (r.detail ?? {}) as Record<string, unknown>;
    const subjectUser = typeof detail.user_id === "string" ? detail.user_id : null;
    const { subject, lines } = describeSecurityEvent(
      { kind: r.kind, detail, created_at: r.created_at },
      { storeName: store?.name, actorEmail: await emailOf(r.actor_id), subjectEmail: await emailOf(subjectUser) },
    );

    const recipients = new Set<string>(adminIds);
    if (store && ownerShouldHear(r.kind)) recipients.add(store.owner_id);
    for (const userId of recipients) {
      try {
        await notifyUser(userId, {
          event: "security_xpub_change",
          subject,
          text: lines.join("\n"),
          force: true,
          metadata: { security_event_id: r.id, kind: r.kind, store_id: r.store_id },
        });
      } catch (e) {
        console.error("[security-events] alert failed", { id: r.id, message: (e as Error).message });
      }
    }
  }
  return { processed: rows.length };
}
