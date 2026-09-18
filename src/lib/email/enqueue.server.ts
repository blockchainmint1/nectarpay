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

export interface PaymentAlertEmailData {
  status: "paid" | "underpaid";
  storeName: string;
  invoiceId: string;
  amountDue: string;
  amountReceived: string;
  paymentMethod: string;
  orderId?: string | null;
  /** Full invoice UUID — used to deep-link the button to this exact sale. */
  invoiceUuid?: string | null;
}

/** Polished receipt-style email for merchant payment notifications. */
export function renderPaymentAlertEmail(data: PaymentAlertEmailData): string {
  const paid = data.status === "paid";
  const eyebrow = paid ? "PAYMENT RECEIVED" : "PAYMENT NEEDS ATTENTION";
  const headline = paid ? "You made a sale!" : "A payment came in short";
  const intro = paid
    ? `Great news — ${data.storeName} just received a payment.`
    : `${data.storeName} received a payment, but it did not cover the full invoice.`;
  const accent = paid ? "#F6A21E" : "#D97706";
  const badgeBg = paid ? "#FFF7E8" : "#FFF4E5";
  const statusLabel = paid ? "Paid in full" : "Underpaid";
  const orderRow = data.orderId
    ? detailRow("Order reference", data.orderId)
    : "";
  const saleUrl = data.invoiceUuid
    ? `https://app.nectar-pay.com/sales/${encodeURIComponent(data.invoiceUuid)}`
    : "https://app.nectar-pay.com/dashboard";
  const ctaLabel = data.invoiceUuid ? "View this sale" : "View sale in NectarPay";

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#2B3242;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(headline)} ${escapeHtml(data.amountReceived)} at ${escapeHtml(data.storeName)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;background:#ffffff;"><tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;border:1px solid #E7E1D2;border-radius:12px;overflow:hidden;">
      <tr><td style="background:#0D1B33;padding:24px 32px;border-bottom:4px solid ${accent};">
        <div style="font-size:22px;line-height:1;font-weight:900;color:#ffffff;">Nectar<span style="color:#F6A21E;">Pay</span></div>
        <div style="margin-top:8px;font-size:12px;line-height:1.4;color:#B7C0D4;">Payment notification for ${escapeHtml(data.storeName)}</div>
      </td></tr>
      <tr><td style="padding:36px 32px 30px;background:#ffffff;">
        <div style="font-size:12px;line-height:1.4;font-weight:800;letter-spacing:1.5px;color:${accent};">${eyebrow}</div>
        <h1 style="margin:8px 0 10px;font-size:30px;line-height:1.15;color:#0D1B33;">${headline}</h1>
        <p style="margin:0 0 26px;font-size:16px;line-height:1.55;color:#4B5563;">${escapeHtml(intro)}</p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;background:${badgeBg};border:1px solid #F2D7A3;border-radius:10px;">
          <tr><td align="center" style="padding:24px 20px;">
            <div style="font-size:13px;font-weight:700;color:#6A7182;">${statusLabel}</div>
            <div style="margin-top:5px;font-size:38px;line-height:1.1;font-weight:900;color:#0D1B33;">${escapeHtml(data.amountReceived)}</div>
          </td></tr>
        </table>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;margin-top:24px;border-collapse:collapse;">
          ${detailRow("Store", data.storeName)}
          ${detailRow("Invoice", data.invoiceId)}
          ${detailRow("Payment method", data.paymentMethod)}
          ${detailRow("Invoice total", data.amountDue)}
          ${orderRow}
        </table>

        <div style="margin-top:28px;text-align:center;">
          <a href="https://app.nectar-pay.com/dashboard" style="display:inline-block;padding:14px 24px;border-radius:8px;background:#F6A21E;color:#0D1B33;font-size:15px;font-weight:800;text-decoration:none;">View sale in NectarPay</a>
        </div>
        <p style="margin:22px 0 0;text-align:center;font-size:12px;line-height:1.5;color:#6A7182;">This notification was sent by NectarPay for ${escapeHtml(data.storeName)}.</p>
      </td></tr>
      <tr><td style="padding:20px 28px;background:#FAF8F3;border-top:1px solid #E7E1D2;text-align:center;">
        <p style="margin:0 0 7px;font-size:12px;color:#6A7182;">Part of the <a href="https://honest.money" style="color:#B96A00;text-decoration:none;">honest.money ecosystem</a></p>
        <p style="margin:0;font-size:11px;color:#6A7182;"><a href="https://app.nectar-pay.com/terms" style="color:#6A7182;">Terms</a> &nbsp;·&nbsp; <a href="https://app.nectar-pay.com/privacy" style="color:#6A7182;">Privacy</a> &nbsp;·&nbsp; <a href="https://app.nectar-pay.com/manifesto" style="color:#6A7182;">Manifesto</a></p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

function detailRow(label: string, value: string): string {
  return `<tr><td style="padding:11px 0;border-bottom:1px solid #E7E1D2;font-size:13px;color:#6A7182;">${escapeHtml(label)}</td><td align="right" style="padding:11px 0;border-bottom:1px solid #E7E1D2;font-size:13px;font-weight:700;color:#2B3242;">${escapeHtml(value)}</td></tr>`;
}

/** Minimal branded HTML wrapper for non-payment merchant alert emails. */
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
