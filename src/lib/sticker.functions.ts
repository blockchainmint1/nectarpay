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
    const { createStickerPayment } = await import("./sticker-start.server");
    return createStickerPayment(code, Math.round(data.amount * 100) / 100);
  });