// Notification dispatch — Telegram (via bot token) and Email (placeholder until
// the user runs the email-domain scaffold; logged to notification_log with
// status='skipped' meanwhile).

import { createHmac } from "crypto";

const TELEGRAM_API = "https://api.telegram.org";

export type NotifyEvent =
  | "invoice_paid"
  | "invoice_underpaid"
  | "invoice_overpaid"
  | "invoice_expired"
  | "deposit_received"
  | "plan_renewed"
  | "grace_warning"
  | "security_xpub_change";

export interface NotifyPayload {
  event: NotifyEvent;
  subject: string;
  text: string;
  /** When set, a per-store override (if any) replaces account-level prefs. */
  storeId?: string;
  metadata?: Record<string, unknown>;
}

interface PaymentEmailMetadata {
  storeName: string;
  invoiceId: string;
  amountDue: string;
  amountReceived: string;
  paymentMethod: string;
  orderId?: string | null;
  invoiceUuid?: string | null;
}

interface BillingEmailMetadata {
  status: "renewed" | "payment_due" | "blocked";
  planName: string;
  priceUsd?: string;
  txcCharged?: string;
  txcNeeded?: string;
  txcBalance?: string;
  nextRenewal?: string;
  graceEnds?: string;
}

function isPaymentEmailMetadata(value: unknown): value is PaymentEmailMetadata {
  if (!value || typeof value !== "object") return false;
  const data = value as Record<string, unknown>;
  return ["storeName", "invoiceId", "amountDue", "amountReceived", "paymentMethod"].every(
    (key) => typeof data[key] === "string",
  );
}

function isBillingEmailMetadata(value: unknown): value is BillingEmailMetadata {
  if (!value || typeof value !== "object") return false;
  const data = value as Record<string, unknown>;
  return (
    typeof data.planName === "string" &&
    (data.status === "renewed" || data.status === "payment_due" || data.status === "blocked")
  );
}

async function sendTelegram(
  token: string,
  chatId: string,
  text: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
    const json = (await res.json()) as { ok: boolean; description?: string };
    if (!json.ok) return { ok: false, error: json.description ?? `tg ${res.status}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function notifyUser(
  userId: string,
  payload: NotifyPayload,
): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: accountPrefs } = await supabaseAdmin
    .from("notification_prefs")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  // Per-store override, when the event belongs to a store.
  let override: {
    enabled: boolean;
    email_enabled: boolean;
    email_address: string | null;
    telegram_enabled: boolean;
    events: Record<string, boolean>;
  } | null = null;
  if (payload.storeId) {
    const { data: row } = await supabaseAdmin
      .from("store_notification_prefs")
      .select("enabled, email_enabled, email_address, telegram_enabled, events")
      .eq("user_id", userId)
      .eq("store_id", payload.storeId)
      .maybeSingle();
    if (row) {
      override = {
        enabled: row.enabled,
        email_enabled: row.email_enabled,
        email_address: row.email_address,
        telegram_enabled: row.telegram_enabled,
        events: (row.events as Record<string, boolean>) ?? {},
      };
    }
  }

  if (override && !override.enabled) return;

  const prefs = override
    ? {
        email_enabled: override.email_enabled,
        email_address: override.email_address ?? accountPrefs?.email_address ?? null,
        telegram_enabled: override.telegram_enabled,
        telegram_chat_id: accountPrefs?.telegram_chat_id ?? null,
        events: override.events,
      }
    : accountPrefs;

  const events = (prefs?.events as Record<string, boolean>) ?? {};
  if (events[payload.event] === false) return;

  // Telegram
  if (prefs?.telegram_enabled && prefs.telegram_chat_id) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (token) {
      const tgText = `<b>${escapeHtml(payload.subject)}</b>\n${escapeHtml(payload.text)}`;
      const result = await sendTelegram(token, prefs.telegram_chat_id, tgText);
      await supabaseAdmin.from("notification_log").insert({
        user_id: userId,
        channel: "telegram",
        event: payload.event,
        recipient: prefs.telegram_chat_id,
        subject: payload.subject,
        body: payload.text,
        status: result.ok ? "sent" : "failed",
        error: result.error ?? null,
        metadata: (payload.metadata ?? null) as never,
      });
    }
  }

  // Email — enqueued onto the Lovable Emails queue.
  if (prefs?.email_enabled && prefs.email_address) {
    const { enqueueAppEmail, renderAlertEmail, renderBillingAlertEmail, renderPaymentAlertEmail } = await import("@/lib/email/enqueue.server");
    const html =
      (payload.event === "invoice_paid" ||
        payload.event === "invoice_underpaid" ||
        payload.event === "invoice_overpaid") &&
      isPaymentEmailMetadata(payload.metadata)
        ? renderPaymentAlertEmail({
            status:
              payload.event === "invoice_paid"
                ? "paid"
                : payload.event === "invoice_overpaid"
                  ? "overpaid"
                  : "underpaid",
            ...payload.metadata,
          })
        : (payload.event === "plan_renewed" || payload.event === "grace_warning") &&
            isBillingEmailMetadata(payload.metadata)
          ? renderBillingAlertEmail(payload.metadata)
          : renderAlertEmail(payload.subject, payload.text.split("\n"));
    const result = await enqueueAppEmail({
      to: prefs.email_address,
      subject: payload.subject,
      html,
      text: payload.text,
      label: payload.event,
    });
    await supabaseAdmin.from("notification_log").insert({
      user_id: userId,
      channel: "email",
      event: payload.event,
      recipient: prefs.email_address,
      subject: payload.subject,
      body: payload.text,
      status: result.ok ? "sent" : result.error === "email_suppressed" ? "skipped" : "failed",
      error: result.error ?? null,
      metadata: (payload.metadata ?? null) as never,
    });
  }

}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Stable per-token secret for the telegram webhook secret_token. */
export function deriveTelegramWebhookSecret(): string {
  const t = process.env.TELEGRAM_BOT_TOKEN ?? "";
  return createHmac("sha256", "telegram-webhook").update(t).digest("base64url");
}
