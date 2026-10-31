/**
 * Cold Storage Coin IDs are the 6 characters after the leading "T" of the coin's
 * TEXITcoin address. They are mixed-case (base58), so case matters — never upper-case them.
 * The same ID is the merchant's sticker code.
 */
export function normalizeCoinId(raw: string): string | null {
  const v = raw.trim().replace(/\s+/g, "");
  return /^[0-9A-Za-z]{6}$/.test(v) ? v : null;
}

/** TEXITcoin P2PKH addresses start with T and are base58. */
export function isTxcAddress(a: string): boolean {
  return /^T[1-9A-HJ-NP-Za-km-z]{25,34}$/.test(a);
}

/** The coin ID printed on a sticker must match the address it claims. */
export function coinIdMatchesAddress(coinId: string, address: string): boolean {
  return address.slice(1, 7) === coinId;
}

export function stickerPath(code: string): string {
  const normalized = normalizeCoinId(code);
  if (!normalized) throw new Error("Invalid sticker code");
  return `/s/${normalized}`;
}

/** Static coin payments must be new, exact credits; never guess a partial sale. */
export function stickerCreditEligible(input: {
  txid: string; excluded: string[]; amount: number; expected: number;
  blockTimeMs: number | null; createdAt: string;
}): boolean {
  if (input.excluded.includes(input.txid)) return false;
  if (!Number.isFinite(input.amount) || Math.abs(input.amount - input.expected) > 0.00000001) return false;
  if (input.blockTimeMs != null && input.blockTimeMs < Date.parse(input.createdAt)) return false;
  return true;
}

/* ------------------------------------------------------------------ */
/* Public-form abuse controls                                           */
/* ------------------------------------------------------------------ */

/** At most this many enrollments from one address... */
export const ENROLL_IP_MAX = 5;
/** ...inside this many minutes. */
export const ENROLL_IP_WINDOW_MIN = 30;

/** True while an address that already made `recentCount` submissions may make one more. */
export function ipWithinLimit(recentCount: number, max: number = ENROLL_IP_MAX): boolean {
  return recentCount < max;
}

/** The visitor's address. Proxies append to x-forwarded-for, so the first hop is the client. */
export function clientIpFromHeaders(get: (name: string) => string | null): string | null {
  const xff = get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const alt = get("cf-connecting-ip") ?? get("x-real-ip");
  return alt?.trim() || null;
}

/** Bot trap: a hidden field people never see, so only a script ever fills it in. */
export const HONEYPOT_FIELD = "company_url";

export function honeypotFilled(value: string | undefined | null): boolean {
  return typeof value === "string" && value.trim() !== "";
}
