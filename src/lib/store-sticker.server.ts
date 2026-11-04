// Store-slug stickers: /s/<url_slug> for stores without a Cold Storage Coin.
// Sales start with no coin chosen; the shopper picks one on /i/<id> and a
// fresh address is derived from the store's own wallet, like the register.
import { STORE_SLUG_RE } from "./fast-enroll";

export type StickerMerchant = { kind: "coin" | "store"; code: string; name: string; store_id: string; giving: boolean };

async function admin() {
  return (await import("@/integrations/supabase/client.server")).supabaseAdmin;
}

/** Resolve a slug to a payable store. Coin-backed stores always use their coin sticker. */
export async function storeStickerMerchant(slug: string): Promise<StickerMerchant | null> {
  const s = slug.toLowerCase();
  if (!STORE_SLUG_RE.test(s)) return null;
  const db = await admin();
  const { data: store } = await db.from("stores").select("id, name, egiving_enabled, deactivated_at").eq("url_slug", s).maybeSingle();
  if (!store || store.deactivated_at) return null;
  const { data: coin } = await db.from("fast_enrollments").select("coin_id").eq("store_id", store.id).eq("status", "activated").maybeSingle();
  if (coin?.coin_id) return { kind: "coin", code: coin.coin_id, name: store.name, store_id: store.id, giving: !!store.egiving_enabled };
  const { count } = await db.from("chain_configs").select("id", { count: "exact", head: true }).eq("store_id", store.id).eq("enabled", true);
  if (!count) return null;
  return { kind: "store", code: s, name: store.name, store_id: store.id, giving: !!store.egiving_enabled };
}

export async function createStoreStickerPayment(slug: string, amount: number) {
  if (!(amount > 0) || Math.round(amount * 100) / 100 !== amount) throw new Error("Amount must be a positive amount in whole cents.");
  const m = await storeStickerMerchant(slug);
  if (!m || m.kind !== "store") throw new Error("This store is not accepting sticker payments.");
  const db = await admin();
  const { data: store } = await db.from("stores").select("fiat_currency, invoice_ttl_seconds").eq("id", m.store_id).single();
  const ttl = store?.invoice_ttl_seconds ?? 900;
  const { data: inv, error } = await db.from("invoices").insert({
    store_id: m.store_id, chain: null, fiat_amount: amount, fiat_currency: store?.fiat_currency ?? "USD",
    crypto_amount: null, rate: null, address: null, derivation_index: null, address_index: null,
    status: "pending", description: `Sticker payment · ${m.code}`, expires_at: new Date(Date.now() + ttl * 1000).toISOString(),
  }).select("id").single();
  if (error || !inv) throw new Error("Could not start payment.");
  return { id: inv.id };
}
