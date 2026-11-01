import { StickerLookup, StickerPayment, StickerPaid, verifyStickerSignature, stickerResponseSignature } from "./sticker-partner";
import { EGIVING_DISCOUNT_PCT, EGIVING_PROGRAM_ADDRESS } from "./egiving";

export async function handleStickerPartner(request: Request, payment: boolean | "paid") {
  const json = (body: unknown, status: number) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
  const raw = await request.text();
  if (raw.length > 2048) return json({ error: "Request too large." }, 413);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: partners, error: partnerError } = await supabaseAdmin.from("card_partners").select("id, secret, uses_legacy_secret, is_default, active");
  if (partnerError) return json({ error: "Partner authentication unavailable." }, 503);
  const pid = request.headers.get("x-hme-partner");
  const partner = (partners ?? []).find((p) => p.active && (pid ? p.id === pid : p.is_default));
  const secret = partner && (partner.secret || (partner.uses_legacy_secret ? process.env["NFC_PAY_SECRET"] : undefined));
  if (!partner || !secret || !verifyStickerSignature(secret, raw, request.headers.get("x-hme-timestamp") ?? "", request.headers.get("x-hme-signature") ?? "")) return json({ error: "Invalid partner signature." }, 401);
  const signed = (body: unknown, status = 200) => {
    const text = JSON.stringify(body);
    const ts = String(Math.floor(Date.now() / 1000));
    return new Response(text, { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", "X-HME-Timestamp": ts, "X-HME-Signature": stickerResponseSignature(secret, raw, text, ts) } });
  };
  let input: { code: string; request_id: string; amount?: number; invoice_id?: string; txid?: string };
  try { input = (payment === "paid" ? StickerPaid : payment ? StickerPayment : StickerLookup).parse(JSON.parse(raw)); }
  catch { return signed({ error: "Supply a case-sensitive six-character code, request_id UUID, and a valid USD amount for payments." }, 400); }
  const { publicSticker } = await import("./fast-enroll.server");
  const merchant = await publicSticker(input.code);
  if (!merchant) return signed({ error: "This sticker is not accepting payments.", request_id: input.request_id }, 404);
  const { data: enrollment, error: enrollmentError } = await supabaseAdmin.from("fast_enrollments").select("tsd_address").eq("coin_id", input.code).eq("status", "activated").eq("store_id", merchant.store_id).maybeSingle();
  const { data: store, error: storeError } = await supabaseAdmin.from("stores").select("name, website, business_logo_url, egiving_enabled").eq("id", merchant.store_id).is("deactivated_at", null).maybeSingle();
  if (enrollmentError || storeError) return signed({ error: "Merchant lookup unavailable." }, 503);
  if (!enrollment || !store) return signed({ error: "Merchant unavailable." }, 404);
  if (payment === "paid") {
    if (!input.invoice_id || !input.txid) return signed({ error: "Supply invoice_id and txid." }, 400);
    const { data: invoice, error: invoiceError } = await supabaseAdmin.from("invoices").select("id, store_id, address, chain, token_symbol, status, sticker_invoice_guards!inner(invoice_id)").eq("id", input.invoice_id).maybeSingle();
    if (invoiceError) return signed({ error: "Invoice lookup unavailable." }, 503);
    if (!invoice || invoice.store_id !== merchant.store_id || invoice.address !== enrollment.tsd_address || invoice.chain !== "txc" || invoice.token_symbol !== "TSD") return signed({ error: "Invoice does not match this sticker.", request_id: input.request_id }, 404);
    const { scanBtcLikeInvoiceNow } = await import("./watcher.functions");
    try { await scanBtcLikeInvoiceNow(invoice.id, input.txid); }
    catch { return signed({ error: "Payment verification unavailable. Retry this same invoice and transaction; do not send again.", request_id: input.request_id }, 503); }
    const { data: fresh, error: freshError } = await supabaseAdmin.from("invoices").select("status").eq("id", invoice.id).single();
    const { data: tx, error: txError } = await supabaseAdmin.from("transactions").select("confirmed_at").eq("invoice_id", invoice.id).eq("tx_hash", input.txid).maybeSingle();
    if (freshError || txError || !fresh) return signed({ error: "Payment status unavailable. Retry without sending again." }, 503);
    return signed({ request_id: input.request_id, code: input.code, invoice_id: invoice.id, txid: input.txid, status: fresh.status, transaction_found: !!tx, paid: !!tx?.confirmed_at && ["confirmed", "overpaid"].includes(fresh.status) });
  }
  const details = {
    request_id: input.request_id, code: input.code, store_id: merchant.store_id,
    merchant: { id: merchant.store_id, name: store.name, website: store.website, logo_url: store.business_logo_url },
    chain: "txc", token_symbol: "TSD", currency: "USD", address: enrollment.tsd_address,
    egiving: { accepted: store.egiving_enabled === true, discountPct: EGIVING_DISCOUNT_PCT, program_address: EGIVING_PROGRAM_ADDRESS },
  };
  if (!payment || input.amount === undefined) return signed({ ...details, requires_invoice: true, valid_until: new Date(Date.now() + 300_000).toISOString() });
  const { createStickerPayment } = await import("./sticker-start.server");
  let id: string;
  try { const result = await createStickerPayment(input.code, input.amount); id = result.id; }
  catch (error) {
    const busy = error instanceof Error && error.message.includes("Another shopper");
    return signed({ error: busy ? "Another shopper is paying. Please try again shortly." : "Could not start payment. Do not send; check the payment page before retrying." }, busy ? 409 : 503);
  }
  const { data: invoice, error: invoiceError } = await supabaseAdmin.from("invoices").select("id, address, fiat_amount, crypto_amount, status, expires_at").eq("id", id).single();
  if (invoiceError || !invoice) return signed({ error: "Payment was started but could not be read. Do not send or automatically retry.", invoice_id: id }, 503);
  return signed({ ...details, id: invoice.id, invoice_id: invoice.id, address: invoice.address, fiat_amount: invoice.fiat_amount, crypto_amount: invoice.crypto_amount, status: invoice.status, expires_at: invoice.expires_at, checkout_url: `https://app.nectar-pay.com/i/${invoice.id}`, egiving: { ...details.egiving, merchantMinimumUsd: store.egiving_enabled ? Number(invoice.fiat_amount) * (100 - EGIVING_DISCOUNT_PCT) / 100 : Number(invoice.fiat_amount) } });
}