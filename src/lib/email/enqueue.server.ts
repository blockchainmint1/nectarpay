// Server-side helper for enqueuing pre-rendered app emails onto the Lovable
// Emails queue. The queue processor (/lovable/email/queue/process) sends them.
// NOTE: never include a `run_id` in the payload — the send API rejects
// caller-invented run ids with 404 run_not_found.

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

  // Respect the suppression list (bounces / complaints / unsubscribes).
  const { data: suppressed } = await supabaseAdmin
    .from("suppressed_emails")
    .select("id")
    .eq("email", to.toLowerCase())
    .maybeSingle();

  if (suppressed) {
    await supabaseAdmin.from("email_send_log").insert({
      message_id: messageId,
      template_name: args.label,
      recipient_email: to,
      status: "suppressed",
    });
    return { ok: false, error: "email_suppressed" };
  }

  await supabaseAdmin.from("email_send_log").insert({
    message_id: messageId,
    template_name: args.label,
    recipient_email: to,
    status: "pending",
  });

  const { error } = await supabaseAdmin.rpc("enqueue_email", {
    queue_name: "transactional_emails",
    payload: {
      message_id: messageId,
      idempotency_key: args.idempotencyKey ?? messageId,
      to,
      from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
      sender_domain: SENDER_DOMAIN,
      subject: args.subject,
      html: args.html,
      text: args.text,
      purpose: "transactional",
      label: args.label,
      queued_at: new Date().toISOString(),
    } as never,
  });

  if (error) {
    console.error("[email] enqueue failed", { label: args.label, error });
    await supabaseAdmin.from("email_send_log").insert({
      message_id: messageId,
      template_name: args.label,
      recipient_email: to,
      status: "failed",
      error_message: error.message?.slice(0, 500) ?? "enqueue failed",
    });
    return { ok: false, error: error.message };
  }

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
