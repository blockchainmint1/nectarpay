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
