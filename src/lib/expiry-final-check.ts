// Rules for giving up on an unpaid sale (pure, no I/O, so they are tested).
//
// 1. Last look: before a sale expires, Ethereum/Base and TEXITcoin/TSD/
//    Bitcoin/Litecoin/Dogecoin sales get one more blockchain check. An expired
//    sale can no longer settle by itself, so this is the safety net for a
//    payment the minute-by-minute scan missed. (ZCU is read block by block in
//    the same watcher run, just before expiry.)
// 2. Still confirming: a sale whose payment was already seen is never expired
//    while the payment confirms — only after CONFIRMING_HOLD_MS past expiry
//    (a payment that never confirms must not lock the address forever).
// 3. Late payments: an hour after a sale expires, the watcher looks once more
//    for payments in its window that no sale took, and puts them in the
//    merchant's "payments waiting for a sale" list.

import { isBtcLikeChain } from "./chains/networks";

export const EVM_FINAL_CHECK_CHAINS: readonly string[] = ["eth", "base", "bsc"];

/** How many last looks one watcher run may do; the rest wait a minute. */
export const FINAL_CHECKS_PER_RUN = 8;

/** A sale whose payment is still confirming stays open this long past expiry. */
export const CONFIRMING_HOLD_MS = 24 * 60 * 60 * 1000;

/** Payments up to this long after expiry count as "late" for the sale. */
export const LATE_WINDOW_MS = 60 * 60 * 1000;
/** Look for late payments once the late window has closed (plus a margin). */
export const LATE_CHECK_DELAY_MS = LATE_WINDOW_MS + 5 * 60 * 1000;
/** Only sales that expired within this long are checked for late payments. */
export const LATE_CHECK_LOOKBACK_MS = 3 * 24 * 60 * 60 * 1000;
/** Payments this long before the sale opened can't be for it (clock drift). */
export const EARLY_GRACE_MS = 5 * 60 * 1000;

export type FinalCheckKind = "evm" | "utxo";

export interface ExpiringSale {
  id: string;
  chain: string | null;
  address: string | null;
}

export function finalCheckKind(sale: ExpiringSale): FinalCheckKind | null {
  if (!sale.address || !sale.chain) return null;
  if (EVM_FINAL_CHECK_CHAINS.includes(sale.chain)) return "evm";
  if (isBtcLikeChain(sale.chain)) return "utxo";
  return null;
}

export function planExpiry(
  due: ExpiringSale[],
  maxChecks: number = FINAL_CHECKS_PER_RUN,
): { check: { id: string; kind: FinalCheckKind }[]; expire: string[]; hold: string[] } {
  const check: { id: string; kind: FinalCheckKind }[] = [];
  const expire: string[] = [];
  const hold: string[] = [];
  for (const sale of due) {
    const kind = finalCheckKind(sale);
    if (!kind) expire.push(sale.id);
    else if (check.length < maxChecks) check.push({ id: sale.id, kind });
    else hold.push(sale.id);
  }
  return { check, expire, hold };
}

/** Expiry time before which a still-confirming sale may finally be expired. */
export function confirmingExpiryCutoff(nowMs: number): Date {
  return new Date(nowMs - CONFIRMING_HOLD_MS);
}

/** The time range a payment must fall in to belong to a sale. */
export function saleWindow(createdAt: string, expiresAt: string | null): { startMs: number; endMs: number } {
  const created = Date.parse(createdAt);
  const expires = expiresAt ? Date.parse(expiresAt) : created + 15 * 60 * 1000;
  return { startMs: created - EARLY_GRACE_MS, endMs: expires + LATE_WINDOW_MS };
}

/**
 * Whether a payment nobody took belongs in the merchant's waiting list for
 * this sale, and why. Unknown time (still unconfirmed) counts as late.
 */
export function missedPaymentReason(
  paidAtMs: number | null,
  createdAt: string,
  expiresAt: string | null,
): "missed" | "after_expiry" | null {
  const { startMs, endMs } = saleWindow(createdAt, expiresAt);
  if (paidAtMs == null) return "after_expiry";
  if (paidAtMs < startMs || paidAtMs > endMs) return null;
  const expires = expiresAt ? Date.parse(expiresAt) : Date.parse(createdAt) + 15 * 60 * 1000;
  return paidAtMs > expires ? "after_expiry" : "missed";
}
