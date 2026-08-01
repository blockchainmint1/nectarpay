// Chain network parameters. Confirmed for BTC, TXC (Litecoin-fork, Scrypt PoW,
// SLIP-44 696969, P2PKH 0x42, BIP32 standard Bitcoin version bytes), EVM (ETH + Base),
// Tron (secp256k1 + base58check 0x41 prefix), and Solana (static address + SPL tokens).

export type ChainKind =
  | "btc"
  | "txc"
  | "eth"
  | "base"
  | "bsc"
  | "doge"
  | "ltc"
  | "bch"
  | "dash"
  | "isk"
  | "zcu"
  | "tron"
  | "sol";

/** Omni Layer token issued on a BTC-like chain (Class C / OP_RETURN sends). */
export interface OmniToken {
  symbol: string;
  /** Omni property id (e.g. Texas Stable Dollar = 39 on TEXITcoin). */
  propertyId: number;
  decimals: number;
  /** Human label used on checkout / POS pickers. */
  label: string;
}

export interface BtcLikeNetwork {
  kind: "btc-like";
  symbol: ChainKind;
  name: string;
  /**
   * Base URL of the block indexer. Esplora and Blockbook expose different
   * REST shapes; `indexer` selects the client adapter used by the watcher.
   */
  esploraBase: string;
  /** Indexer flavour. Defaults to "esplora" when omitted. */
  indexer?: "esplora" | "blockbook";
  /** Emit BCH-style CashAddr strings instead of legacy base58 addresses. */
  cashAddrPrefix?: string;
  /** Wallet URI scheme for BIP-21 payment links (e.g. "litecoin"). */
  uriScheme?: string;
  /** Omni Layer tokens accepted on this chain. */
  omniStables?: OmniToken[];
  explorerTx: (txid: string) => string;
  explorerAddr: (addr: string) => string;
  pubKeyHash: number;
  scriptHash: number;
  bech32Hrp: string;
  wif: number;
  bip32Public: number;
  bip32Private: number;
  coinType: number;
  decimals: number;
  receiveBranch: number;
  defaultAddressType: "p2pkh" | "p2wpkh";
  confirmationsRequired: number;
}

export interface EvmNetwork {
  kind: "evm";
  symbol: ChainKind;
  name: string;
  chainId: number;
  rpcUrl: (alchemyKey: string) => string;
  explorerTx: (txid: string) => string;
  explorerAddr: (addr: string) => string;
  stables: { symbol: string; address: string; decimals: number }[];
  confirmationsRequired: number;
}

export interface TronNetwork {
  kind: "tron";
  symbol: ChainKind;
  name: string;
  /** Alchemy Tron base URL with key — TronGrid-compatible REST API lives under this. */
  apiBase: (alchemyKey: string) => string;
  explorerTx: (txid: string) => string;
  explorerAddr: (addr: string) => string;
  decimals: number; // TRX = 6
  stables: { symbol: string; address: string; decimals: number }[];
  confirmationsRequired: number;
}

export interface SolanaNetwork {
  kind: "solana";
  symbol: ChainKind;
  name: string;
  rpcUrl: (alchemyKey: string) => string;
  explorerTx: (sig: string) => string;
  explorerAddr: (addr: string) => string;
  decimals: number; // SOL = 9
  stables: { symbol: string; mint: string; decimals: number }[];
  confirmationsRequired: number; // ~ "confirmed" commitment
}

export const BTC_NETWORK: BtcLikeNetwork = {
  kind: "btc-like",
  symbol: "btc",
  name: "Bitcoin",
  esploraBase: "https://mempool.space/api",
  explorerTx: (t) => `https://mempool.space/tx/${t}`,
  explorerAddr: (a) => `https://mempool.space/address/${a}`,
  pubKeyHash: 0x00,
  scriptHash: 0x05,
  bech32Hrp: "bc",
  wif: 0x80,
  bip32Public: 0x0488b21e,
  bip32Private: 0x0488ade4,
  coinType: 0,
  decimals: 8,
  receiveBranch: 0,
  defaultAddressType: "p2wpkh",
  confirmationsRequired: 1,
};

export const TXC_NETWORK: BtcLikeNetwork = {
  kind: "btc-like",
  symbol: "txc",
  name: "TEXITcoin",
  esploraBase: "https://mempool.texitcoin.org/api",
  explorerTx: (t) => `https://mempool.texitcoin.org/tx/${t}`,
  explorerAddr: (a) => `https://mempool.texitcoin.org/address/${a}`,
  pubKeyHash: 0x42,
  scriptHash: 0x32,
  bech32Hrp: "txc",
  wif: 0xc1,
  bip32Public: 0x0488b21e,
  bip32Private: 0x0488ade4,
  coinType: 696969,
  decimals: 8,
  receiveBranch: 0,
  defaultAddressType: "p2pkh",
  confirmationsRequired: 1,
  // Omni Layer tokens on TEXITcoin. Texas Stable Dollar is property #39,
  // managed + divisible (8 decimals), sent as Class C OP_RETURN simple sends.
  omniStables: [
    { symbol: "TSD", propertyId: 39, decimals: 8, label: "Texas Stable Dollar (TSD)" },
  ],
};

/** Omni token lookup for a BTC-like chain, e.g. getOmniToken("txc", "TSD"). */
export function getOmniToken(chain: string, symbol: string): OmniToken | null {
  const net = (ALL_NETWORKS as Record<string, { kind: string; omniStables?: OmniToken[] }>)[chain];
  if (!net || net.kind !== "btc-like") return null;
  const sym = symbol.toUpperCase();
  return net.omniStables?.find((t) => t.symbol.toUpperCase() === sym) ?? null;
}

export const LTC_NETWORK: BtcLikeNetwork = {
  kind: "btc-like",
  symbol: "ltc",
  name: "Litecoin",
  esploraBase: "https://litecoinspace.org/api",
  indexer: "esplora",
  uriScheme: "litecoin",
  explorerTx: (t) => `https://litecoinspace.org/tx/${t}`,
  explorerAddr: (a) => `https://litecoinspace.org/address/${a}`,
  pubKeyHash: 0x30,
  scriptHash: 0x32,
  bech32Hrp: "ltc",
  wif: 0xb0,
  bip32Public: 0x0488b21e,
  bip32Private: 0x0488ade4,
  coinType: 2,
  decimals: 8,
  receiveBranch: 0,
  defaultAddressType: "p2wpkh",
  confirmationsRequired: 3, // ~7 minutes
};

export const DOGE_NETWORK: BtcLikeNetwork = {
  kind: "btc-like",
  symbol: "doge",
  name: "Dogecoin",
  esploraBase: "https://doge1.trezor.io",
  indexer: "blockbook",
  uriScheme: "dogecoin",
  explorerTx: (t) => `https://doge1.trezor.io/tx/${t}`,
  explorerAddr: (a) => `https://doge1.trezor.io/address/${a}`,
  pubKeyHash: 0x1e,
  scriptHash: 0x16,
  bech32Hrp: "",
  wif: 0x9e,
  bip32Public: 0x0488b21e,
  bip32Private: 0x0488ade4,
  coinType: 3,
  decimals: 8,
  receiveBranch: 0,
  defaultAddressType: "p2pkh",
  confirmationsRequired: 6, // ~6 minutes
};

export const BCH_NETWORK: BtcLikeNetwork = {
  kind: "btc-like",
  symbol: "bch",
  name: "Bitcoin Cash",
  esploraBase: "https://bch1.trezor.io",
  indexer: "blockbook",
  uriScheme: "bitcoincash",
  cashAddrPrefix: "bitcoincash",
  explorerTx: (t) => `https://bch1.trezor.io/tx/${t}`,
  explorerAddr: (a) => `https://bch1.trezor.io/address/${a}`,
  pubKeyHash: 0x00,
  scriptHash: 0x05,
  bech32Hrp: "",
  wif: 0x80,
  bip32Public: 0x0488b21e,
  bip32Private: 0x0488ade4,
  coinType: 145,
  decimals: 8,
  receiveBranch: 0,
  defaultAddressType: "p2pkh",
  confirmationsRequired: 2, // ~20 minutes
};

export const DASH_NETWORK: BtcLikeNetwork = {
  kind: "btc-like",
  symbol: "dash",
  name: "Dash",
  esploraBase: "https://dash1.trezor.io",
  indexer: "blockbook",
  uriScheme: "dash",
  explorerTx: (t) => `https://dash1.trezor.io/tx/${t}`,
  explorerAddr: (a) => `https://dash1.trezor.io/address/${a}`,
  pubKeyHash: 0x4c,
  scriptHash: 0x10,
  bech32Hrp: "",
  wif: 0xcc,
  bip32Public: 0x0488b21e,
  bip32Private: 0x0488ade4,
  coinType: 5,
  decimals: 8,
  receiveBranch: 0,
  defaultAddressType: "p2pkh",
  // InstantSend locks most Dash payments within ~2s; the watcher treats an
  // InstantSend-locked tx as confirmed regardless of block depth.
  confirmationsRequired: 2,
};

export const ETH_NETWORK: EvmNetwork = {
  kind: "evm",
  symbol: "eth",
  name: "Ethereum",
  chainId: 1,
  rpcUrl: (k) => `https://eth-mainnet.g.alchemy.com/v2/${k}`,
  explorerTx: (t) => `https://etherscan.io/tx/${t}`,
  explorerAddr: (a) => `https://etherscan.io/address/${a}`,
  stables: [
    { symbol: "USDC", address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", decimals: 6 },
    { symbol: "USDT", address: "0xdac17f958d2ee523a2206206994597c13d831ec7", decimals: 6 },
    { symbol: "PYUSD", address: "0x6c3ea9036406852006290770bedfcaba0e23a0e8", decimals: 6 },
    { symbol: "DAI", address: "0x6b175474e89094c44da98b954eedeac495271d0f", decimals: 18 },
  ],
  confirmationsRequired: 3,
};

export const BASE_NETWORK: EvmNetwork = {
  kind: "evm",
  symbol: "base",
  name: "Base",
  chainId: 8453,
  rpcUrl: (k) => `https://base-mainnet.g.alchemy.com/v2/${k}`,
  explorerTx: (t) => `https://basescan.org/tx/${t}`,
  explorerAddr: (a) => `https://basescan.org/address/${a}`,
  stables: [
    { symbol: "USDC", address: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913", decimals: 6 },
    { symbol: "USDT", address: "0xfde4c96c8593536e31f229ea8f37b2ada2699bb2", decimals: 6 },
    { symbol: "DAI", address: "0x50c5725949a6f0c72e6c4a641f24049a917db0cb", decimals: 18 },
  ],
  confirmationsRequired: 1,
};

export const BSC_NETWORK: EvmNetwork = {
  kind: "evm",
  symbol: "bsc",
  name: "BNB Smart Chain",
  chainId: 56,
  rpcUrl: (k) => `https://bnb-mainnet.g.alchemy.com/v2/${k}`,
  explorerTx: (t) => `https://bscscan.com/tx/${t}`,
  explorerAddr: (a) => `https://bscscan.com/address/${a}`,
  stables: [
    { symbol: "USDT", address: "0x55d398326f99059ff775485246999027b3197955", decimals: 18 },
    { symbol: "USDC", address: "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d", decimals: 18 },
    { symbol: "DAI", address: "0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3", decimals: 18 },
  ],
  confirmationsRequired: 3,
};

/** EVM networks that share a derivation path — one xpub covers all of them. */
export const EVM_NETWORKS: EvmNetwork[] = [ETH_NETWORK, BASE_NETWORK, BSC_NETWORK];

export const TRON_NETWORK: TronNetwork = {
  kind: "tron",
  symbol: "tron",
  name: "Tron",
  apiBase: (k) => `https://tron-mainnet.g.alchemy.com/v2/${k}`,
  explorerTx: (t) => `https://tronscan.org/#/transaction/${t}`,
  explorerAddr: (a) => `https://tronscan.org/#/address/${a}`,
  decimals: 6,
  stables: [
    { symbol: "USDT", address: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t", decimals: 6 },
    { symbol: "USDC", address: "TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8", decimals: 6 },
  ],
  confirmationsRequired: 19, // Tron finality ~ 19 SR confirmations
};

export const SOL_NETWORK: SolanaNetwork = {
  kind: "solana",
  symbol: "sol",
  name: "Solana",
  rpcUrl: (k) => `https://solana-mainnet.g.alchemy.com/v2/${k}`,
  explorerTx: (s) => `https://solscan.io/tx/${s}`,
  explorerAddr: (a) => `https://solscan.io/account/${a}`,
  decimals: 9,
  stables: [
    { symbol: "USDC", mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", decimals: 6 },
    { symbol: "USDT", mint: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", decimals: 6 },
    { symbol: "PYUSD", mint: "2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo", decimals: 6 },
  ],
  confirmationsRequired: 1, // "confirmed" commitment
};

// ---- stables helpers ----

/** Stable symbols we allow to be enabled per chain. Curated whitelist. */
export const SUPPORTED_STABLES_BY_CHAIN: Partial<Record<ChainKind, readonly string[]>> = {
  txc: ["TSD"],
  eth: ["USDC", "USDT", "PYUSD", "DAI"],
  base: ["USDC", "USDT", "DAI"],
  bsc: ["USDT", "USDC", "DAI"],
  tron: ["USDT", "USDC"],
  sol: ["USDC", "USDT", "PYUSD"],
};

/** Every stable symbol pegged to $1 in the conversion layer. */
export const PEGGED_USD_SYMBOLS: readonly string[] = ["USDC", "USDT", "DAI", "PYUSD", "TSD"];

/**
 * Payment options pinned to the top of every picker (POS + hosted checkout),
 * regardless of the merchant's chain display_order. Texas Stable Dollar is
 * the flagship rail: instant, dollar-denominated, near-zero fees.
 */
export const PINNED_OPTION_KEYS: readonly string[] = ["txc:TSD"];

/** Stable-sorts a payment-option list so pinned keys come first, in order. */
export function pinPreferredOptions<T extends { key: string }>(options: T[]): T[] {
  const rank = (k: string) => {
    const i = PINNED_OPTION_KEYS.indexOf(k);
    return i === -1 ? PINNED_OPTION_KEYS.length : i;
  };
  return options
    .map((o, i) => ({ o, i }))
    .sort((a, b) => rank(a.o.key) - rank(b.o.key) || a.i - b.i)
    .map(({ o }) => o);
}


/**
 * EVM chains that share a single derived address per xpub index. For checkout
 * display, a stable enabled on the "eth" chain config is actually receivable
 * on any of these networks (same address), so we surface a single combined
 * option labeled e.g. "USDC on Ethereum, Base or BSC".
 */
export const EVM_CHAIN_KEYS = ["eth", "base", "bsc"] as const;
export const EVM_CHAIN_LABEL: Record<(typeof EVM_CHAIN_KEYS)[number], string> = {
  eth: "Ethereum",
  base: "Base",
  bsc: "BSC",
};
/** EVM chains on which a given stable token is recognized by the watcher. */
export function evmChainsForStable(symbol: string): (typeof EVM_CHAIN_KEYS)[number][] {
  const sym = symbol.toUpperCase();
  return EVM_CHAIN_KEYS.filter((k) =>
    (SUPPORTED_STABLES_BY_CHAIN[k] ?? []).map((s) => s.toUpperCase()).includes(sym),
  );
}

// ---- finality tiers (for mempool / 0-conf acceptance) ----

/**
 * Fast-finality chains: L2s and high-throughput chains where mempool / first
 * confirmation is low-risk. Base, BSC, Solana, Tron.
 */
export const FAST_FINALITY_CHAINS: readonly ChainKind[] = ["base", "bsc", "tron", "sol"] as const;

/**
 * Slow-finality chains: Bitcoin family + Ethereum L1, where reorgs/double-spends
 * carry meaningfully more risk. Mempool acceptance here is the "yolo" tier.
 */
export const SLOW_FINALITY_CHAINS: readonly ChainKind[] = ["btc", "txc", "eth", "doge", "ltc", "bch", "dash", "isk", "zcu"] as const;

/** Every BTC-fork chain the shared UTXO watcher handles. */
export const BTC_LIKE_CHAINS: readonly ChainKind[] = ["btc", "txc", "ltc", "doge", "bch", "dash"] as const;

export function isBtcLikeChain(chain: string | null | undefined): boolean {
  return !!chain && (BTC_LIKE_CHAINS as readonly string[]).includes(chain);
}

export function isFastFinality(chain: string): boolean {
  return (FAST_FINALITY_CHAINS as readonly string[]).includes(chain);
}


export interface StableMeta {
  chain: ChainKind;
  symbol: string;
  /** Contract address (EVM/Tron) or SPL mint (Solana). */
  address: string;
  decimals: number;
}

export function getStable(chain: ChainKind, symbol: string): StableMeta | null {
  const net = getNetwork(chain);
  if (!net) return null;
  const sym = symbol.toUpperCase();
  if (net.kind === "evm" || net.kind === "tron") {
    const t = net.stables.find((s) => s.symbol.toUpperCase() === sym);
    return t ? { chain, symbol: t.symbol, address: t.address, decimals: t.decimals } : null;
  }
  if (net.kind === "solana") {
    const t = net.stables.find((s) => s.symbol.toUpperCase() === sym);
    return t ? { chain, symbol: t.symbol, address: t.mint, decimals: t.decimals } : null;
  }
  if (net.kind === "btc-like") {
    // Omni Layer token: "address" is the property id as a string.
    const t = net.omniStables?.find((s) => s.symbol.toUpperCase() === sym);
    return t
      ? { chain, symbol: t.symbol, address: String(t.propertyId), decimals: t.decimals }
      : null;
  }
  return null;
}


export const ALL_NETWORKS = {
  btc: BTC_NETWORK,
  txc: TXC_NETWORK,
  ltc: LTC_NETWORK,
  doge: DOGE_NETWORK,
  bch: BCH_NETWORK,
  dash: DASH_NETWORK,
  eth: ETH_NETWORK,
  base: BASE_NETWORK,
  bsc: BSC_NETWORK,
  tron: TRON_NETWORK,
  sol: SOL_NETWORK,
} as const;

export function getNetwork(chain: ChainKind) {
  return (ALL_NETWORKS as Record<string, BtcLikeNetwork | EvmNetwork | TronNetwork | SolanaNetwork>)[
    chain
  ];
}
