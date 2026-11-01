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
  .inputValidator((d: unknown) => Code.extend({ amount: z.number().finite().positive() }).parse(d))
  .handler(async ({ data }) => {
    const code = normalizeCoinId(data.code);
    if (!code) throw new Error("Invalid sticker code.");
    const { createStickerPayment } = await import("./sticker-start.server");
    return createStickerPayment(code, Math.round(data.amount * 100) / 100);
  });
/** Public: has a sticker sale for this merchant arrived since `since`? Returns only paid/amount. */
export const fastTestPayment = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Code.extend({ since: z.string().datetime() }).parse(d))
  .handler(async ({ data }) => {
    const code = normalizeCoinId(data.code);
    if (!code) return { paid: false as const };
    const { publicSticker } = await import("./fast-enroll.server");
    const merchant = await publicSticker(code);
    if (!merchant) return { paid: false as const };
    const { testPaymentArrived } = await import("./fast-enroll");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin.from("invoices").select("status, fiat_amount")
      .eq("store_id", merchant.store_id).gte("created_at", data.since)
      .in("status", ["detected", "confirmed"]).order("created_at", { ascending: false }).limit(1);
    const row = rows?.[0];
    return row && testPaymentArrived(row.status) ? { paid: true as const, amount: Number(row.fiat_amount) } : { paid: false as const };
  });
