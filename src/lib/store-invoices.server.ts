// Helpers for merchant-issued payment requests (invoices emailed to a customer).
// Server-only: builds the branded email and enqueues it via Lovable Emails.

const APP_ORIGIN = "https://app.nectar-pay.com";

export function invoiceUrl(invoiceId: string): string {
  return `${APP_ORIGIN}/i/${invoiceId}`;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export interface InvoiceEmailArgs {
  invoiceId: string;
  storeName: string;
  amount: number;
  currency: string;
  description?: string | null;
  memo?: string | null;
  expiresAt: string;
  reminder?: boolean;
}

export function renderInvoiceEmail(args: InvoiceEmailArgs): {
  subject: string;
  html: string;
  text: string;
} {
  const url = invoiceUrl(args.invoiceId);
  const amount = formatMoney(args.amount, args.currency);
  const subject = args.reminder
    ? `Reminder: payment request from ${args.storeName} — ${amount}`
    : `Payment request from ${args.storeName} — ${amount}`;

  const expires = new Date(args.expiresAt).toUTCString();

  const html = `<!doctype html><html><body style="margin:0;background:#ffffff;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1a1a1a;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <div style="font-size:13px;letter-spacing:.18em;text-transform:uppercase;color:#a9791d;font-weight:700;">Nectar.Pay</div>
    <h1 style="margin:12px 0 4px;font-size:22px;">${esc(args.storeName)} sent you a payment request</h1>
    <p style="margin:0 0 24px;color:#555;font-size:14px;">Pay with bitcoin, stablecoins, or any supported network. Nothing is custodial — funds go straight to the merchant.</p>
    <div style="border:1px solid #e6e6e6;border-radius:12px;padding:20px;margin-bottom:24px;">
      <div style="font-size:12px;text-transform:uppercase;letter-spacing:.12em;color:#888;">Amount due</div>
      <div style="font-size:30px;font-weight:700;margin:4px 0 12px;">${esc(amount)}</div>
      ${args.description ? `<div style="font-size:14px;color:#333;">${esc(args.description)}</div>` : ""}
      ${args.memo ? `<div style="font-size:13px;color:#666;margin-top:8px;white-space:pre-wrap;">${esc(args.memo)}</div>` : ""}
    </div>
    <a href="${url}" style="display:inline-block;background:#e0a520;color:#141414;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:10px;">Pay this invoice</a>
    <p style="margin:20px 0 0;font-size:13px;color:#777;">Or open: <a href="${url}" style="color:#a9791d;">${url}</a></p>
    <p style="margin:8px 0 0;font-size:12px;color:#999;">This request expires ${esc(expires)}.</p>
  </div>
</body></html>`;

  const text = [
    `${args.storeName} sent you a payment request.`,
    ``,
    `Amount due: ${amount}`,
    args.description ? `For: ${args.description}` : "",
    args.memo ? args.memo : "",
    ``,
    `Pay here: ${url}`,
    `Expires: ${expires}`,
  ]
    .filter(Boolean)
    .join("\n");

  return { subject, html, text };
}

/** Enqueue (or re-enqueue) the payment-request email for an invoice. */
export async function sendInvoiceEmail(
  to: string,
  args: InvoiceEmailArgs,
): Promise<{ ok: boolean; error?: string }> {
  const { enqueueAppEmail } = await import("@/lib/email/enqueue.server");
  const { subject, html, text } = renderInvoiceEmail(args);
  return enqueueAppEmail({
    to,
    subject,
    html,
    text,
    label: args.reminder ? "invoice_request_resend" : "invoice_request",
    idempotencyKey: `invoice-${args.invoiceId}-${Date.now()}`,
  });
}
