// Rules for changing a store's wallet keys by hand (Wallets & Chains page).
// Pure helpers so the server function and tests share one definition.

/** Hours a REPLACEMENT wallet key waits before it takes payments (DB trigger chain_key_cooloff). */
export const KEY_COOL_OFF_HOURS = 4;

export type ChainKeyKind = "xpub" | "xpub-or-address" | "address" | "btc-address";

/** What each coin accepts when pasted by hand. ZCU copies the EVM key server-side. */
export const CHAIN_KEY_KIND: Record<string, ChainKeyKind> = {
  txc: "xpub",
  btc: "xpub",
  eth: "xpub",
  ltc: "xpub",
  bch: "xpub",
  doge: "xpub",
  dash: "xpub",
  tron: "xpub-or-address",
  sol: "address",
  lightning: "btc-address",
};

export function isXpubLike(s: string): boolean {
  return /^([xtuvyz]pub)[1-9A-HJ-NP-Za-km-z]{100,120}$/.test(s.trim());
}
export function isSolanaAddressLike(s: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s.trim());
}
export function isTronAddressLike(s: string): boolean {
  return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(s.trim());
}
export function isBtcAddressLike(s: string): boolean {
  return /^(bc1[a-z0-9]{25,87}|[13][a-km-zA-HJ-NP-Z1-9]{25,39})$/.test(s.trim());
}

export type NormalizedKey =
  | { ok: true; xpub: string | null; xpub_or_address: string }
  | { ok: false; error: string };

/**
 * Turn a pasted value into the stored columns. Blank is only allowed for the
 * Lightning payout address (= "derive from my Bitcoin wallet").
 */
export function normalizeChainKey(chain: string, raw: string): NormalizedKey {
  const kind = CHAIN_KEY_KIND[chain];
  if (!kind) return { ok: false, error: "This coin's wallet can't be set by hand." };
  const v = raw.trim();
  if (!v) {
    return kind === "btc-address"
      ? { ok: true, xpub: null, xpub_or_address: "" }
      : { ok: false, error: "Enter an xpub or address first." };
  }
  switch (kind) {
    case "xpub":
      return isXpubLike(v) ? { ok: true, xpub: v, xpub_or_address: v } : { ok: false, error: "Doesn't look like an xpub." };
    case "xpub-or-address":
      if (isXpubLike(v)) return { ok: true, xpub: v, xpub_or_address: v };
      return isTronAddressLike(v) ? { ok: true, xpub: null, xpub_or_address: v } : { ok: false, error: "Expected an xpub or a T-address." };
    case "address":
      return isSolanaAddressLike(v) ? { ok: true, xpub: null, xpub_or_address: v } : { ok: false, error: "Not a valid Solana address." };
    case "btc-address":
      return isBtcAddressLike(v) ? { ok: true, xpub: null, xpub_or_address: v } : { ok: false, error: "Not a valid Bitcoin address." };
  }
}

/** The payout key a row currently uses (xpub wins), or null when empty. */
export function currentKey(row: { xpub?: string | null; xpub_or_address?: string | null } | null | undefined): string | null {
  const x = (row?.xpub ?? "").trim();
  if (x) return x;
  const a = (row?.xpub_or_address ?? "").trim();
  return a || null;
}

/**
 * Emailed-code rule for a hand-pasted key change: admins always need it; the
 * owner/team only skip it for the very first key on a store that has none.
 */
export function keyChangeNeedsEmailCode(opts: { actingAsAdmin: boolean; storeHasAnyKey: boolean }): boolean {
  return opts.actingAsAdmin || opts.storeHasAnyKey;
}
