/** Shared start path for browser checkout and authenticated wallet partners. */
export async function createStickerPayment(code: string, amount: number) {
  const { publicSticker } = await import("./fast-enroll.server");
  const merchant = await publicSticker(code);
  if (!merchant) throw new Error("This merchant is not yet accepting sticker payments.");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: enrollment, error: lookupError } = await supabaseAdmin.from("fast_enrollments").select("tsd_address").eq("coin_id", code).eq("status", "activated").single();
  if (lookupError || !enrollment) throw new Error("Merchant unavailable.");
  const { getAddressTxs } = await import("./chains/btc-like.server");
  const { TXC_NETWORK } = await import("./chains/networks");
  const txs = await getAddressTxs(TXC_NETWORK, enrollment.tsd_address);
  const { data: id, error } = await supabaseAdmin.rpc("create_sticker_invoice", { _code: code, _amount: amount, _excluded: txs.map((t) => t.txid) });
  if (error || !id) throw new Error(error?.message ?? "Could not start payment.");
  return { id };
}