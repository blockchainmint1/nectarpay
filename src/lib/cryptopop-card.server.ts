import { createHmac, timingSafeEqual } from "crypto";
import { CARD_APPROVAL_TIMEOUT_MS } from "./cryptopop-card";

export const CRYPTOPOP_CARD_URL = "https://app.cryptopop.org/api/public/card/pay";

export function cardHeaders(secret: string, content: string, now = Date.now()) {
  const timestamp = String(Math.floor(now / 1000));
  return { "content-type": "application/json", "x-hme-timestamp": timestamp, "x-hme-signature": createHmac("sha256", secret).update(`${timestamp}.${content}`).digest("hex") };
}

export function issueCardPollToken(secret: string, invoiceId: string, terminalId: string, paymentId: string, now = Date.now()) {
  const encoded = Buffer.from(JSON.stringify({ invoiceId, terminalId, paymentId, exp: now + CARD_APPROVAL_TIMEOUT_MS + 60_000 })).toString("base64url");
  return `${encoded}.${createHmac("sha256", secret).update(`card-poll.${encoded}`).digest("hex")}`;
}

export function validCardPollToken(secret: string, token: string, invoiceId: string, terminalId: string, paymentId: string, now = Date.now()) {
  const parts = token.split(".");
  if (parts.length !== 2 || !/^[a-f0-9]{64}$/.test(parts[1])) return false;
  const expected = createHmac("sha256", secret).update(`card-poll.${parts[0]}`).digest();
  if (!timingSafeEqual(expected, Buffer.from(parts[1], "hex"))) return false;
  try {
    const data = JSON.parse(Buffer.from(parts[0], "base64url").toString());
    return data.invoiceId === invoiceId && data.terminalId === terminalId && data.paymentId === paymentId && Number.isFinite(data.exp) && data.exp > now;
  } catch { return false; }
}