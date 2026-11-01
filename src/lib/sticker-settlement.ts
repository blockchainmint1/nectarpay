/** Expiry releases checkout locks; an in-window blockchain payment can still be recovered. */
export function stickerPaymentInWindow(createdAt: string, expiresAt: string, blockTimeMs: number | null) {
  if (blockTimeMs === null) return Date.now() <= Date.parse(expiresAt);
  return Number.isFinite(blockTimeMs) && blockTimeMs >= Date.parse(createdAt) && blockTimeMs <= Date.parse(expiresAt);
}