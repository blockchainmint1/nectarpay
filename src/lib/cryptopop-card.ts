import { z } from "zod";

export const CARD_APPROVAL_TIMEOUT_MS = 15 * 60_000;
export const CARD_POLL_INTERVAL_MS = 1500;
export const CardRequest = z.union([
  z.object({ payment_id: z.string().uuid(), poll_token: z.string().min(1).max(1024) }),
  z.object({ card_uid: z.string().min(4).max(64).regex(/^[0-9a-fA-F:\s-]+$/), pin: z.string().regex(/^\d{4,8}$/).optional() }),
]);
export type CardReply = {
  status: "sent" | "pin_required" | "approval_required" | "sending" | "declined" | "failed";
  txid: string | null; reason: string | null; payment_id: string | null; poll_token?: string;
};

const ProviderReply = z.object({
  status: z.enum(["sent", "pin_required", "approval_required", "sending", "declined", "failed"]),
  txid: z.string().regex(/^[a-f0-9]{64}$/i).nullish(),
  reason: z.string().max(500).nullish(), error: z.string().max(500).optional(),
  payment_id: z.string().uuid().nullish(),
});

export function normalizeCardReply(raw: unknown, httpOk: boolean): CardReply {
  const parsed = ProviderReply.safeParse(raw);
  if (!parsed.success || !httpOk) return { status: "failed", txid: null, payment_id: null, reason: parsed.success ? parsed.data.reason ?? parsed.data.error ?? "CryptoPOP card service is unavailable." : "CryptoPOP returned an invalid payment response." };
  const r = parsed.data;
  if (r.status === "sent" && !r.txid) return { status: "failed", txid: null, payment_id: r.payment_id ?? null, reason: "CryptoPOP did not return a transaction reference. Check the sale before retrying." };
  return { status: r.status, txid: r.txid ?? null, payment_id: r.payment_id ?? null, reason: r.reason ?? r.error ?? null };
}

export function cardInvoiceError(invoice: { status: string; fiat_currency: string | null; expires_at: string }, acceptsTsd: boolean, now = Date.now()): string | null {
  if (invoice.status !== "pending") return "This sale is no longer open.";
  if (!Number.isFinite(Date.parse(invoice.expires_at)) || Date.parse(invoice.expires_at) <= now) return "This sale has expired.";
  if (invoice.fiat_currency?.toUpperCase() !== "USD") return "Card payments need a USD sale.";
  if (!acceptsTsd) return "This store doesn't accept TSD.";
  return null;
}