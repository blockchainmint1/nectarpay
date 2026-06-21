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
  | "isk"
  | "zcu"
  | "tron"
  | "sol";

export interface BtcLikeNetwork {
  kind: "btc-like";
  symbol: ChainKind;
  name: string;
  esploraBase: string;
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
  ],
  confirmationsRequired: 3,
};

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
  ],
  confirmationsRequired: 1, // "confirmed" commitment
};

export const ALL_NETWORKS = {
  btc: BTC_NETWORK,
  txc: TXC_NETWORK,
  eth: ETH_NETWORK,
  base: BASE_NETWORK,
  tron: TRON_NETWORK,
  sol: SOL_NETWORK,
} as const;

export function getNetwork(chain: ChainKind) {
  return (ALL_NETWORKS as Record<string, BtcLikeNetwork | EvmNetwork | TronNetwork | SolanaNetwork>)[
    chain
  ];
}
