/**
 * HME Vault pairing payload (watch-only), shown by Vault as an (animated) QR:
 *   {"hmvault":1,"fp":"73c5da0a","txc":{"44":"xpub…","49":"…","84":"…"},
 *    "isk":{…},"btc":{…},"ltc":{…},"doge":{"44":"…"},
 *    "evm":{"address":"0x…","path":"m/44'/60'/0'/0/0","xpub":"xpub…"?}}
 * Account xpubs at m/<purpose>'/<coin>'/0'. Mirrors HME Wallet's parser.
 * Pure + browser-safe so the scanner and server share one validator.
 */
export type VaultStoreChain = "txc" | "btc" | "ltc" | "doge" | "eth";

/** Which Vault purpose feeds each store chain — must match our address style per network. */
export const VAULT_PURPOSE_FOR_CHAIN: Record<Exclude<VaultStoreChain, "eth">, "44" | "84"> = {
  txc: "44", // TXC legacy P2PKH
  btc: "84", // native segwit bc1…
  ltc: "84", // ltc1…
  doge: "44",
};

export interface VaultStoreKeys {
  fp: string;
  keys: Partial<Record<VaultStoreChain, string>>;
  /** Vault gave only a single EVM address (no account xpub) — can't rotate addresses. */
  evmAddressOnly: boolean;
}

const XPUB_RE = /^xpub[1-9A-HJ-NP-Za-km-z]{100,120}$/;

export function parseVaultPairing(text: string): VaultStoreKeys {
  let o: Record<string, unknown>;
  try {
    o = JSON.parse(text.trim());
  } catch {
    throw new Error("That QR code isn't an HME Vault pairing code.");
  }
  if (!o || typeof o !== "object" || o.hmvault !== 1)
    throw new Error("That QR code isn't an HME Vault pairing code.");
  const fp = typeof o.fp === "string" ? o.fp.toLowerCase() : "";
  if (!/^[0-9a-f]{8}$/.test(fp)) throw new Error("Pairing code is missing the wallet fingerprint.");

  const keys: VaultStoreKeys["keys"] = {};
  for (const [chain, purpose] of Object.entries(VAULT_PURPOSE_FOR_CHAIN) as [Exclude<VaultStoreChain, "eth">, string][]) {
    const entry = o[chain] as Record<string, unknown> | undefined;
    const x = entry && typeof entry === "object" ? entry[purpose] : undefined;
    if (x === undefined) continue;
    if (typeof x !== "string" || !XPUB_RE.test(x)) throw new Error(`Pairing code has an invalid ${chain.toUpperCase()} key.`);
    keys[chain] = x;
  }

  let evmAddressOnly = false;
  const e = o.evm as Record<string, unknown> | undefined;
  if (e && typeof e === "object") {
    if (typeof e.xpub === "string") {
      if (!XPUB_RE.test(e.xpub)) throw new Error("Pairing code has an invalid Ethereum key.");
      keys.eth = e.xpub;
    } else if (typeof e.address === "string") {
      evmAddressOnly = true;
    }
  }

  if (!Object.keys(keys).length) throw new Error("Pairing code contains no keys Nectar.Pay can use.");
  return { fp, keys, evmAddressOnly };
}
