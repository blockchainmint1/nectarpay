import { isTxcAddress, normalizeCoinId } from "./fast-enroll";

export type FastCoinQr = { coinId: string; publicKey: string | null };

/** Read only public coin identifiers; never extract private keys or follow QR links. */
export function parseFastCoinQr(raw: string): FastCoinQr | null {
  const text = raw.trim();
  if (isTxcAddress(text)) return { coinId: text.slice(1, 7), publicKey: text };
  const code = normalizeCoinId(text);
  if (code) return { coinId: code, publicKey: null };
  const payment = /^(?:texitcoin|txc):\/*(T[1-9A-HJ-NP-Za-km-z]{25,34})(?:\?.*)?$/i.exec(text);
  if (payment) return parseFastCoinQr(payment[1]);
  try {
    const url = new URL(text);
    if (url.protocol === "https:" && url.hostname === "app.nectar-pay.com") {
      const sticker = /^\/s\/([A-Za-z0-9]{6})\/?$/.exec(url.pathname);
      if (sticker) return { coinId: sticker[1], publicKey: null };
    }
  } catch { /* Not a supported public coin QR. */ }
  return null;
}