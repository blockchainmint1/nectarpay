// Single-address EVM mode ("rotation off"): every Ethereum / Base / BSC sale
// for a store is paid to the wallet's main address (#0). Sales are told apart
// only by a tiny unique tail on the amount, so matching must be strict:
//   1. exact tail match → that sale
//   2. no exact match, but exactly ONE open sale within a cent → that sale
//   3. anything else → nobody; the payment is parked for the merchant
// Pure helpers (no I/O) so the rules are unit-tested.

/** The address index every single-address EVM sale is paid to. */
export const EVM_SHARED_INDEX = 0;

/** True when an EVM invoice sits on the store's shared main address. */
export function isSharedEvmInvoice(inv: { address_index?: number | null }): boolean {
  return inv.address_index === EVM_SHARED_INDEX;
}

interface TailSpec {
  /** Base amount is rounded UP to a multiple of this (never underbill). */
  roundTo: number;
  /** One tail step; tails run 1..999 steps. */
  step: number;
}

// Stablecoins: round up to the cent, tail in decimals 3–5 (max +$0.00999).
// Native coins (ETH, BNB): round up to 1e-6, tail in decimals 7–9 — a fraction
// of a cent even at several thousand dollars per coin.
export function tailSpec(isStable: boolean): TailSpec {
  return isStable ? { roundTo: 0.01, step: 1e-5 } : { roundTo: 1e-6, step: 1e-9 };
}

export function tailTolerance(isStable: boolean): number {
  return tailSpec(isStable).step / 2;
}

/** Which tail (1..999, 0 = none) an amount carries. */
export function tailOf(amount: number, isStable: boolean): number {
  const { step } = tailSpec(isStable);
  return Math.round(amount / step) % 1000;
}

/** Base amount rounded up, plus the tail. Always >= baseAmount. */
export function applyTail(baseAmount: number, tail: number, isStable: boolean): number {
  const { roundTo, step } = tailSpec(isStable);
  const units = Math.ceil(Number((baseAmount / roundTo).toFixed(6)));
  return Number((units * roundTo + tail * step).toFixed(isStable ? 5 : 9));
}

/** Pick an unused tail in 1..999, or -1 if every tail is taken. */
export function pickFreeTail(used: Set<number>, random: () => number = Math.random): number {
  const offset = Math.floor(random() * 999);
  for (let i = 0; i < 999; i++) {
    const candidate = ((offset + i) % 999) + 1;
    if (!used.has(candidate)) return candidate;
  }
  return -1;
}

export interface SharedCandidate {
  id: string;
  crypto_amount: number | string | null;
  /** USD per coin locked on the sale; 1 for stablecoins. */
  usdPerUnit: number;
}

/** "Matches to the cent": within one US cent of the expected amount. */
const NEAR_USD = 0.01 + 1e-9;

/**
 * Decide which open sale on a shared address a payment belongs to.
 * Candidates must already be filtered to the same address + token and to sales
 * that existed when the payment moved. Returns null when nobody (or more than
 * one sale) fits — never guess between two sales.
 */
export function pickSharedInvoice(
  candidates: SharedCandidate[],
  paid: number,
  isStable: boolean,
): string | null {
  if (!Number.isFinite(paid) || paid <= 0) return null;
  const tol = tailTolerance(isStable);
  const priced = candidates.filter((c) => c.crypto_amount != null && Number(c.crypto_amount) > 0);

  const exact = priced.filter((c) => Math.abs(paid - Number(c.crypto_amount)) <= tol);
  if (exact.length === 1) return exact[0].id;
  if (exact.length > 1) return null;

  const near = priced.filter(
    (c) => Math.abs(paid - Number(c.crypto_amount)) * (c.usdPerUnit > 0 ? c.usdPerUnit : 0) <= NEAR_USD
      && c.usdPerUnit > 0,
  );
  return near.length === 1 ? near[0].id : null;
}
