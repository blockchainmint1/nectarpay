// How a store hands out Ethereum / Base / BSC receive addresses. Browser-safe.
//   shared  — every sale pays the wallet's main address (#0); amount tails tell sales apart.
//   recycle — rotate, re-using an idle address once its last sale is fully done.
//   fresh   — rotate, never giving an address to a second sale.
// Stored as stores.evm_address_rotation (false = shared) + stores.evm_address_reuse.

export type EvmAddressMode = "shared" | "recycle" | "fresh";

export function evmAddressMode(rotation: boolean | null | undefined, reuse: boolean | null | undefined): EvmAddressMode {
  if (rotation === false) return "shared";
  return reuse === false ? "fresh" : "recycle";
}

export function evmAddressColumns(mode: EvmAddressMode): { evm_address_rotation: boolean; evm_address_reuse: boolean } {
  return { evm_address_rotation: mode !== "shared", evm_address_reuse: mode !== "fresh" };
}

/** An address may go to a new sale only this long after its last sale opened. */
export const RECYCLE_AFTER_OPEN_MS = 60 * 60 * 1000;
/**
 * ...and only once its last sale's late-payment hour has passed (plus a margin),
 * so a late payment for the old sale can never land on the new one.
 * Mirrors LATE_CHECK_DELAY_MS in expiry-final-check.ts.
 */
export const RECYCLE_AFTER_EXPIRY_MS = 65 * 60 * 1000;

const OPEN = ["pending", "detected", "underpaid"];

/** Whether an address whose earlier sales are `sales` can go to a new sale now. */
export function addressReusable(
  sales: Array<{ status: string; created_at: string; expires_at: string | null }>,
  nowMs: number,
): boolean {
  return sales.every((s) => {
    if (OPEN.includes(s.status)) return false;
    const created = Date.parse(s.created_at);
    const expires = s.expires_at ? Date.parse(s.expires_at) : created + 15 * 60 * 1000;
    return created < nowMs - RECYCLE_AFTER_OPEN_MS && expires < nowMs - RECYCLE_AFTER_EXPIRY_MS;
  });
}
