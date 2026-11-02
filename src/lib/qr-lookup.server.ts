import { QrLookup } from "./qr-lookup";
import { verifyStickerSignature, stickerResponseSignature } from "./sticker-partner";
import { EGIVING_PROGRAM_ADDRESS } from "./egiving";

/**
 * Signed partner lookup for a scanned register/checkout QR. The QR only points
 * (sale id or address); store, Give status and discount always come from here.
 */
export async function handleQrLookup(request: Request) {
  const json = (body: unknown, status: number) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
  const raw = await request.text();
  if (raw.length > 2048) return json({ error: "Request too large." }, 413);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: partners, error } = await supabaseAdmin.from("card_partners").select("id, secret, uses_legacy_secret, is_default, active");
  if (error) return json({ error: "Partner authentication unavailable." }, 503);
  const pid = request.headers.get("x-hme-partner");
  const partner = (partners ?? []).find((p) => p.active && (pid ? p.id === pid : p.is_default));
  const secret = partner && (partner.secret || (partner.uses_legacy_secret ? process.env["NFC_PAY_SECRET"] : undefined));
  if (!partner || !secret || !verifyStickerSignature(secret, raw, request.headers.get("x-hme-timestamp") ?? "", request.headers.get("x-hme-signature") ?? "")) return json({ error: "Invalid partner signature." }, 401);
  const signed = (body: unknown, status = 200) => {
    const text = JSON.stringify(body);
    const ts = String(Math.floor(Date.now() / 1000));
    return new Response(text, { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", "X-HME-Timestamp": ts, "X-HME-Signature": stickerResponseSignature(secret, raw, text, ts) } });
  };
  let input: { request_id: string; invoice_id?: string; address?: string };
  try { input = QrLookup.parse(JSON.parse(raw)); }
  catch { return signed({ error: "Supply request_id plus invoice_id or address." }, 400); }

  let invoiceId = input.invoice_id ?? null;
  if (!invoiceId && input.address) {
    // Plain address QR: the open sale at that address, if exactly one is open.
    const { data: open, error: e } = await supabaseAdmin.from("invoices").select("id").eq("address", input.address)
      .in("status", ["pending", "detected", "underpaid"]).gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false }).limit(2);
    if (e) return signed({ error: "Lookup unavailable." }, 503);
    if (open && open.length === 1) invoiceId = open[0].id;
    else if (!open?.length) {
      const { data: sticker } = await supabaseAdmin.from("fast_enrollments").select("coin_id").eq("tsd_address", input.address).eq("status", "activated").maybeSingle();
      if (sticker) return signed({ request_id: input.request_id, kind: "sticker", code: sticker.coin_id, next: "Call /api/public/v1/stickers/lookup with this code." });
      return signed({ request_id: input.request_id, error: "No open NectarPay sale for this address." }, 404);
    } else return signed({ request_id: input.request_id, error: "Several open sales use this address; scan the register's full code." }, 409);
  }

  const { readPublicInvoice } = await import("./checkout.server");
  const result = await readPublicInvoice({ id: invoiceId! });
  if (!result.found || invoiceId === "demo") return signed({ request_id: input.request_id, error: "Sale not found." }, 404);
  const inv = result.invoice;
  const { data: storeRow } = await supabaseAdmin.from("invoices").select("store_id, stores(name, website, business_logo_url, url_slug)").eq("id", inv.id).maybeSingle();
  const st = (storeRow?.stores ?? null) as { name: string; website: string | null; business_logo_url: string | null; url_slug: string | null } | null;
  return signed({
    request_id: input.request_id, kind: "invoice", invoice_id: inv.id, status: inv.status,
    fiat_amount: inv.fiatAmount, currency: inv.fiatCurrency, chain: inv.chain, token_symbol: inv.tokenSymbol,
    crypto_amount: inv.cryptoAmount, address: inv.address, expires_at: inv.expiresAt,
    merchant: st ? { id: storeRow!.store_id, name: st.name, website: st.website, logo_url: st.business_logo_url, slug: st.url_slug } : null,
    egiving: "egiving" in result && result.egiving ? { ...result.egiving, program_address: result.egiving.accepted ? EGIVING_PROGRAM_ADDRESS : undefined } : { accepted: false },
    checkout_url: `https://app.nectar-pay.com/i/${inv.id}`,
  });
}
