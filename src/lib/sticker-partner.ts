import { createHash, createHmac, timingSafeEqual } from "crypto";
import { z } from "zod";

export const StickerLookup = z.object({ code: z.string().regex(/^[0-9A-Za-z]{6}$/), request_id: z.string().uuid() }).strict();
export const StickerPayment = StickerLookup.extend({ amount: z.number().finite().min(0.5).max(250).refine((n) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-8, "Use whole cents.") });

export function verifyStickerSignature(secret: string, raw: string, timestamp: string, signature: string, now = Date.now()) {
  if (!/^\d{10}$/.test(timestamp) || Math.abs(now / 1000 - Number(timestamp)) > 300 || !/^[0-9a-f]{64}$/.test(signature)) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${raw}`).digest();
  return timingSafeEqual(expected, Buffer.from(signature, "hex"));
}

/** The signed response is bound to the exact request, not just the sticker code. */
export function stickerResponseSignature(secret: string, requestRaw: string, responseRaw: string, timestamp: string) {
  const requestHash = createHash("sha256").update(requestRaw).digest("hex");
  return createHmac("sha256", secret).update(`sticker-response.${timestamp}.${requestHash}.${responseRaw}`).digest("hex");
}