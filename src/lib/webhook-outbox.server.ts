// Durable outbound store callbacks. The invoices_enqueue_webhooks trigger
// saves one webhook_deliveries row per event in the same database step that
// marks a sale paid/underpaid/overpaid; this module sends due rows, records
// every attempt, and schedules retries (src/lib/webhook-retry.ts).
import type { WebhookEvent } from "./webhooks.server";
import { WEBHOOK_LEASE_MS, isDeliveredStatus, sortWebhookRows, webhookRetryDelayMs } from "./webhook-retry";

type Row = {
  id: string;
  invoice_id: string;
  attempt: number;
  event_type: string | null;
  payload: WebhookEvent;
  created_at: string;
};

const COLS = "id, invoice_id, attempt, event_type, payload, created_at";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** Send one saved callback if it's still due and nobody else holds it. */
async function sendRow(row: Row): Promise<{ ok: boolean; status: number | null; error: string | null }> {
  const db = await admin();
  const nowIso = new Date().toISOString();
  // Claim: bump the attempt counter only if no other sender already did.
  const { data: claimed } = await db
    .from("webhook_deliveries")
    .update({ attempt: row.attempt + 1, next_retry_at: new Date(Date.now() + WEBHOOK_LEASE_MS).toISOString() })
    .eq("id", row.id)
    .eq("attempt", row.attempt)
    .is("delivered_at", null)
    .lte("next_retry_at", nowIso)
    .select("id");
  if (!claimed?.length) return { ok: false, status: null, error: "already in progress" };
  const attemptsMade = row.attempt + 1;

  const { data: inv } = await db
    .from("invoices")
    .select("id, token_symbol, rate, stores(webhook_url, webhook_secret)")
    .eq("id", row.invoice_id)
    .maybeSingle();
  const store = (inv?.stores ?? null) as { webhook_url: string | null; webhook_secret: string | null } | null;
  if (!inv || !store?.webhook_url || !store.webhook_secret) {
    await db.from("webhook_deliveries")
      .update({ next_retry_at: null, response_body: "Store no longer has a callback link; not sent." })
      .eq("id", row.id);
    return { ok: false, status: null, error: "no webhook configured" };
  }

  const event = row.payload;
  if (event.data && (event.data.paid_amount_usd === null || event.data.paid_amount_usd === undefined)) {
    const { totalPaidUsdForInvoice } = await import("./watcher.functions");
    event.data.paid_amount_usd = await totalPaidUsdForInvoice(
      inv.id,
      (inv.token_symbol as string | null) ?? null,
      inv.rate == null ? null : Number(inv.rate),
    );
  }
  if (event.data) event.data.fiat_amount = Number(event.data.fiat_amount);

  // Current link + secret: a merchant fixing a broken link gets the retry there.
  const { deliverWebhook } = await import("./webhooks.server");
  const result = await deliverWebhook({ url: store.webhook_url, secret: store.webhook_secret, event });
  const ok = result.ok && isDeliveredStatus(result.status);
  const delay = ok ? null : webhookRetryDelayMs(attemptsMade);
  await db.from("webhook_deliveries").update({
    url: store.webhook_url,
    payload: event as unknown as never,
    signature: result.signature,
    status_code: result.status ?? null,
    response_body: (result.responseBody ?? result.error ?? null)?.slice(0, 500) ?? null,
    delivered_at: ok ? new Date().toISOString() : null,
    next_retry_at: delay === null ? null : new Date(Date.now() + delay).toISOString(),
  }).eq("id", row.id);
  if (!ok) console.error(`webhook delivery failed (invoice ${row.invoice_id}, attempt ${attemptsMade}):`, result.status, result.error);
  return { ok, status: result.status ?? null, error: result.error ?? null };
}

async function sendInvoiceRows(rows: Row[]) {
  for (const row of sortWebhookRows(rows)) {
    try { await sendRow(row); } catch (e) { console.error("[webhooks] send crashed", row.id, (e as Error).message); }
  }
}

/** Send every due callback for one sale now (right after it's marked paid). */
export async function deliverInvoiceWebhooksNow(invoiceId: string): Promise<void> {
  const db = await admin();
  const { data } = await db
    .from("webhook_deliveries")
    .select(COLS)
    .eq("invoice_id", invoiceId)
    .is("delivered_at", null)
    .not("next_retry_at", "is", null)
    .lte("next_retry_at", new Date().toISOString())
    .order("created_at");
  await sendInvoiceRows((data ?? []) as unknown as Row[]);
}

/** Watcher tick: send callbacks that are due (first tries cut short, retries). */
export async function deliverDueWebhooks(limit = 20): Promise<{ attempted: number }> {
  const db = await admin();
  const { data } = await db
    .from("webhook_deliveries")
    .select(COLS)
    .is("delivered_at", null)
    .not("next_retry_at", "is", null)
    .lte("next_retry_at", new Date().toISOString())
    .order("next_retry_at")
    .limit(limit);
  const rows = (data ?? []) as unknown as Row[];
  const byInvoice = new Map<string, Row[]>();
  for (const r of rows) byInvoice.set(r.invoice_id, [...(byInvoice.get(r.invoice_id) ?? []), r]);
  // Different sales in parallel so one slow merchant server can't stall the rest.
  await Promise.allSettled([...byInvoice.values()].map(sendInvoiceRows));
  return { attempted: rows.length };
}

/** Merchant-requested resend: saved and logged like any other callback. */
export async function redeliverInvoiceWebhook(inv: {
  id: string; store_id: string; status: string; chain: string | null; address: string | null;
  fiat_amount: number | string; fiat_currency: string; external_order_id: string | null;
}, url: string) {
  const db = await admin();
  const type: WebhookEvent["type"] = inv.status === "underpaid" ? "invoice.underpaid" : "invoice.confirmed";
  const event = {
    id: (crypto as { randomUUID: () => string }).randomUUID(),
    type,
    created_at: new Date().toISOString(),
    data: {
      invoice_id: inv.id, store_id: inv.store_id, status: inv.status, chain: inv.chain ?? "",
      address: inv.address, fiat_amount: Number(inv.fiat_amount), fiat_currency: inv.fiat_currency,
      paid_amount_usd: null, order_id: inv.external_order_id ?? null,
    },
  };
  const { data: row, error } = await db.from("webhook_deliveries").insert({
    invoice_id: inv.id, store_id: inv.store_id, url, event_type: type, payload: event as unknown as never,
    attempt: 0, next_retry_at: new Date().toISOString(),
  }).select(COLS).single();
  if (error || !row) throw new Error(error?.message ?? "Could not save the resend.");
  const result = await sendRow(row as unknown as Row);
  return { ...result, event_id: event.id, event_type: type };
}

/**
 * Receipts whose send was cut off mid-way stay "pending" forever. After 15
 * minutes, mark them failed so the normal retry path sends them once more.
 */
export async function retryInterruptedReceipts(): Promise<void> {
  const db = await admin();
  const { data } = await db
    .from("email_send_log")
    .select("id")
    .eq("template_name", "customer_receipt")
    .eq("status", "pending")
    .lt("created_at", new Date(Date.now() - 15 * 60_000).toISOString())
    .gt("created_at", new Date(Date.now() - 2 * 86_400_000).toISOString())
    .limit(10);
  if (!data?.length) return;
  const { sendCustomerReceipt } = await import("./email/customer-receipt.server");
  for (const r of data) {
    const { data: flipped } = await db.from("email_send_log")
      .update({ status: "failed", error_message: "Interrupted before sending; retrying." })
      .eq("id", r.id).eq("status", "pending").select("id");
    if (flipped?.length) await sendCustomerReceipt(r.id).catch(() => undefined);
  }
}
