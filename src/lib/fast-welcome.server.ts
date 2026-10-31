// Server-only: turns a verified /fast enrollment into a live sticker store and
// sends the merchant their welcome email (sticker link + Telegram alert link).
import { randomBytes } from "crypto";
import { buildWelcomeEmail } from "@/lib/fast-welcome";

/** Admin account that manages starter stores until the merchant's ownership is confirmed. */
const DEFAULT_STARTER_MANAGER = "6c97c646-b243-49ed-9a5f-1980b3e9ecbd";
const TELEGRAM_LINK_DAYS = 14;

export function starterManagerId(): string {
  return process.env["FAST_STARTER_MANAGER_ID"] || DEFAULT_STARTER_MANAGER;
}

/** Store-scoped Telegram link: tapping it sends this store's sale alerts to that chat. */
async function storeTelegramLink(storeId: string, managerId: string): Promise<string | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const code = randomBytes(9).toString("base64url");
  const expires = new Date(Date.now() + TELEGRAM_LINK_DAYS * 86400_000).toISOString();
  const { error } = await supabaseAdmin
    .from("telegram_bind_codes")
    .insert({ code, user_id: managerId, store_id: storeId, expires_at: expires });
  if (error) {
    console.error("[fast] telegram link failed", error.message);
    return null;
  }
  const bot = (process.env["TELEGRAM_BOT_USERNAME"] || "TexitPayBot").replace(/^@+/, "");
  return `https://t.me/${bot}?start=${code}`;
}

/** Activate (idempotent) and email the merchant once. Never throws: the enrollment is already saved. */
export async function activateAndWelcome(enrollmentId: string, managerId = starterManagerId()) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: storeId, error } = await supabaseAdmin.rpc("activate_fast_sticker", { _id: enrollmentId, _manager: managerId });
  if (error || !storeId) {
    console.error("[fast] auto-activation failed", error?.message);
    return { storeId: null as string | null, emailed: false };
  }
  const { data: f } = await supabaseAdmin
    .from("fast_enrollments")
    .select("coin_id, business_name, contact_name, email, welcome_sent_at")
    .eq("id", enrollmentId)
    .single();
  if (!f || f.welcome_sent_at) return { storeId: storeId as string, emailed: false };

  const telegramLink = await storeTelegramLink(storeId as string, managerId);
  const mail = buildWelcomeEmail({
    businessName: f.business_name,
    contactName: f.contact_name,
    coinId: f.coin_id,
    email: f.email,
    telegramLink,
  });
  const { enqueueAppEmail } = await import("@/lib/email/enqueue.server");
  const sent = await enqueueAppEmail({ to: f.email, subject: mail.subject, html: mail.html, text: mail.text, label: "fast_welcome" });
  await supabaseAdmin
    .from("fast_enrollments")
    .update(sent.ok ? { welcome_sent_at: new Date().toISOString(), welcome_error: null } : { welcome_error: (sent.error ?? "send failed").slice(0, 300) })
    .eq("id", enrollmentId);
  return { storeId: storeId as string, emailed: sent.ok };
}
