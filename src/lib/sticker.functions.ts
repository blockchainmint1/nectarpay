import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { normalizeCoinId } from "./fast-enroll";

const Code = z.object({ code: z.string().regex(/^[0-9A-Za-z]{6}$/) });
export const getStickerMerchant = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => Code.parse(d))
  .handler(async ({ data }) => {
    const { publicSticker } = await import("./fast-enroll.server");
    return publicSticker(data.code);
  });

export const startStickerPayment = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Code.extend({ amount: z.number().finite().min(0.5).max(250) }).parse(d))
  .handler(async ({ data }) => {
    const code = normalizeCoinId(data.code);
    if (!code) throw new Error("Invalid sticker code.");
    const { publicSticker } = await import("./fast-enroll.server");
    const merchant = await publicSticker(code);
    if (!merchant) throw new Error("This merchant is not yet accepting sticker payments.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: enrollment } = await supabaseAdmin.from("fast_enrollments").select("tsd_address").eq("coin_id", code).eq("status", "activated").single();
    if (!enrollment) throw new Error("Merchant unavailable.");
    const { getAddressTxs } = await import("./chains/btc-like.server");
    const { TXC_NETWORK } = await import("./chains/networks");
    // Snapshot before making this static address payable; fail closed if indexer is down.
    const txs = await getAddressTxs(TXC_NETWORK, enrollment.tsd_address);
    const { data: id, error } = await supabaseAdmin.rpc("create_sticker_invoice", { _code: code, _amount: Math.round(data.amount * 100) / 100, _excluded: txs.map((t) => t.txid) });
    if (error || !id) throw new Error(error?.message ?? "Could not start payment.");
    return { id };
  });