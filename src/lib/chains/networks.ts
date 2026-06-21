// Chain network parameters. Confirmed for BTC, TXC (Litecoin-fork, Scrypt PoW,
// SLIP-44 696969, P2PKH 0x42, BIP32 standard Bitcoin version bytes), and EVM (ETH + Base).

export type ChainKind = "btc" | "txc" | "eth" | "base" | "doge" | "isk" | "zcu";

export interface BtcLikeNetwork {
  kind: "btc-like";
  symbol: ChainKind;
  name: string;
  /** Esplora-compatible base URL with `/api` already appended. */
  esploraBase: string;
  explorerTx: (txid: string) => string;
  explorerAddr: (addr: string) => string;
  /** Address byte params. */
  pubKeyHash: number;
  scriptHash: number;
  bech32Hrp: string;
  wif: number;
  bip32Public: number;
  bip32Private: number;
  /** SLIP-44 coin type. */
  coinType: number;
  decimals: number;
  /** Default external-chain derivation suffix appended to the xpub: `0/i`. */
  receiveBranch: number;
  /** Address type for derivation. "p2pkh" → legacy "T…"/"1…"; "p2wpkh" → bech32. */
  defaultAddressType: "p2pkh" | "p2wpkh";
  confirmationsRequired: number;
}

export interface EvmNetwork {
  kind: "evm";
  symbol: ChainKind;
  name: string;
  chainId: number;
  /** Returns the JSON-RPC URL after substituting the Alchemy key. */
  rpcUrl: (alchemyKey: string) => string;
  explorerTx: (txid: string) => string;
  explorerAddr: (addr: string) => string;
  /** Stable-coin contracts watched on this chain. */
  stables: { symbol: string; address: string; decimals: number }[];
  confirmationsRequired: number;
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
  pubKeyHash: 0x42, // T...
  scriptHash: 0x32,
  bech32Hrp: "txc",
  wif: 0xc1,
  bip32Public: 0x0488b21e,
  bip32Private: 0x0488ade4,
  coinType: 696969,
  decimals: 8,
  receiveBranch: 0,
  defaultAddressType: "p2pkh", // most TXC wallets are legacy "T…"
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

export const ALL_NETWORKS = {
  btc: BTC_NETWORK,
  txc: TXC_NETWORK,
  eth: ETH_NETWORK,
  base: BASE_NETWORK,
} as const;

export function getNetwork(chain: ChainKind) {
  return (ALL_NETWORKS as Record<string, BtcLikeNetwork | EvmNetwork>)[chain];
}
