import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { normalizeCoinId } from "./fast-enroll";

const Code = z.object({ code: z.string().regex(/^[0-9A-Za-z]{6}$/) });
// Sticker codes: a case-sensitive 6-char coin ID, or a store web code (slug).
const AnyCode = z.object({ code: z.string().min(1).max(64).regex(/^[0-9A-Za-z-]+$/) });

async function resolve(code: string) {
  const coin = normalizeCoinId(code);
  if (coin) {
    const { publicSticker } = await import("./fast-enroll.server");
    const m = await publicSticker(coin);
    if (m) return { kind: "coin" as const, code: m.code, name: m.name, store_id: m.store_id, giving: m.giving };
  }
  const { storeStickerMerchant } = await import("./store-sticker.server");
  return storeStickerMerchant(code);
}

export const getStickerMerchant = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => AnyCode.parse(d))
  .handler(async ({ data }) => resolve(data.code));

export const startStickerPayment = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => AnyCode.extend({ amount: z.number().finite().positive() }).parse(d))
  .handler(async ({ data }) => {
    const m = await resolve(data.code);
    if (!m) throw new Error("This sticker is not accepting payments yet.");
    const amount = Math.round(data.amount * 100) / 100;
    if (m.kind === "coin") {
      const { createStickerPayment } = await import("./sticker-start.server");
      return createStickerPayment(m.code, amount);
    }
    const { createStoreStickerPayment } = await import("./store-sticker.server");
    return createStoreStickerPayment(m.code, amount);
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
