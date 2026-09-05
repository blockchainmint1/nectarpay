// Server-side helper for sending app emails through Lovable's managed email
// API. Delivery, retries, suppression and unsubscribe handling are enforced by
// Lovable server-side; we keep writing our own email_send_log rows so the app's
// reporting keeps working.

import { EmailAPIError, sendLovableEmail } from "@lovable.dev/email-js";

const SITE_NAME = "NectarPay";
const SENDER_DOMAIN = "notify.nectar-pay.com";
const FROM_DOMAIN = "nectar-pay.com";

export interface EnqueueEmailArgs {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Short label used for logging/reporting, e.g. "invoice_paid". */
  label: string;
  idempotencyKey?: string;
}

export async function enqueueAppEmail(
  args: EnqueueEmailArgs,
): Promise<{ ok: boolean; error?: string }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const messageId = crypto.randomUUID();
  const to = args.to.trim();

  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) {
    console.error("[email] LOVABLE_API_KEY is not configured", { label: args.label });
    const { error } = await supabaseAdmin.from("email_send_log").insert({
      message_id: messageId,
      template_name: args.label,
      recipient_email: to,
      status: "failed",
      error_message: "LOVABLE_API_KEY is not configured",
    });
    if (error) console.error("[email] send log insert failed", { code: error.code, message: error.message });
    return { ok: false, error: "email_not_configured" };
  }

  try {
    await sendLovableEmail(
      {
        to,
        from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
        sender_domain: SENDER_DOMAIN,
        subject: args.subject,
        html: args.html,
        text: args.text,
        purpose: "transactional",
        label: args.label,
        idempotency_key: args.idempotencyKey ?? messageId,
      },
      { apiKey, sendUrl: process.env["LOVABLE_SEND_URL"] },
    );
  } catch (err) {
    if (err instanceof EmailAPIError && err.code === "recipient_suppressed") {
      const { error } = await supabaseAdmin.from("email_send_log").insert({
        message_id: messageId,
        template_name: args.label,
        recipient_email: to,
        status: "suppressed",
      });
      if (error) console.error("[email] send log insert failed", { code: error.code, message: error.message });
      return { ok: false, error: "email_suppressed" };
    }

    const message = err instanceof Error ? err.message : "send failed";
    console.error("[email] send failed", { label: args.label, message });
    const { error } = await supabaseAdmin.from("email_send_log").insert({
      message_id: messageId,
      template_name: args.label,
      recipient_email: to,
      status: "failed",
      error_message: message.slice(0, 500),
    });
    if (error) console.error("[email] send log insert failed", { code: error.code, message: error.message });
    return { ok: false, error: message };
  }

  const { error } = await supabaseAdmin.from("email_send_log").insert({
    message_id: messageId,
    template_name: args.label,
    recipient_email: to,
    status: "sent",
  });
  if (error) console.error("[email] send log insert failed", { code: error.code, message: error.message });

  return { ok: true };
}

/** Minimal branded HTML wrapper for merchant alert emails. */
export function renderAlertEmail(subject: string, lines: string[]): string {
  const rows = lines
    .map(
      (l) =>
        `<div style="padding:4px 0;color:#dddddd;white-space:pre-wrap;">${escapeHtml(l)}</div>`,
    )
    .join("");
  return `<!doctype html><html><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#0b0b0d;color:#eeeeee;padding:24px;">
<div style="max-width:640px;margin:0 auto;background:#141418;border:1px solid #2a2a30;border-radius:12px;padding:24px;">
  <h1 style="margin:0 0 12px;font-size:18px;color:#f5c542;">${escapeHtml(subject)}</h1>
  ${rows}
  <p style="margin-top:20px;"><a href="https://app.nectar-pay.com/dashboard" style="color:#f5c542;">Open your dashboard →</a></p>
</div></body></html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
