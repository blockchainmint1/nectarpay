// Outbound webhook signing + delivery for invoice status changes.
// Uses HMAC-SHA256 over `${timestamp}.${rawBody}` keyed by the store's
// `webhook_secret`. Header format matches the docs: `t=<unix>,v1=<hex>`.

import { createHmac } from "crypto";

export interface WebhookEvent {
  id: string;                 // unique event id (uuid)
  type: "invoice.paid" | "invoice.underpaid" | "invoice.confirmed";
  created_at: string;         // ISO timestamp
  data: {
    invoice_id: string;
    store_id: string;
    status: string;
    chain: string;
    address: string | null;
    fiat_amount: number;
    fiat_currency: string;
    paid_amount_usd: number;
    order_id?: string | null;
  };
}

export function signWebhookBody(secret: string, rawBody: string, nowSec?: number): string {
  const t = nowSec ?? Math.floor(Date.now() / 1000);
  const v1 = createHmac("sha256", secret).update(`${t}.${rawBody}`).digest("hex");
  return `t=${t},v1=${v1}`;
}

/** Best-effort POST to the merchant's webhook URL. Logs but never throws. */
export async function deliverWebhook(opts: {
  url: string;
  secret: string;
  event: WebhookEvent;
}): Promise<{ ok: boolean; status?: number; error?: string }> {
  const body = JSON.stringify(opts.event);
  const sig = signWebhookBody(opts.secret, body);
  try {
    const res = await fetch(opts.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-TXCPay-Signature": sig,
        "X-TXCPay-Event": opts.event.type,
        "X-TXCPay-Event-Id": opts.event.id,
        "User-Agent": "payHME-webhook/1",
      },
      body,
      // workerd: bound timeout via AbortSignal
      signal: AbortSignal.timeout(10_000),
    });
    return { ok: res.ok, status: res.status };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
