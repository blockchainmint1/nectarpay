// Wallet balance reader. Derives addresses from the merchant's stored xpubs and
// reads live balances from the same indexers the watcher uses.
//
// Read-only: we never need private keys, only the extended public key already
// on file for the store.

import {
  getNetwork,
  EVM_CHAIN_KEYS,
  EVM_CHAIN_LABEL,
  type ChainKind,
  type BtcLikeNetwork,
  type EvmNetwork,
} from "./chains/networks";
import { getUsdRate } from "./rates.functions";

export interface TokenBalance {
  symbol: string;
  /** Human amount (already decimal-adjusted). */
  amount: number;
  /** Network label, for EVM where one address spans several chains. */
  network?: string;
}

export interface AddressBalance {
  index: number;
  address: string;
  nativeSymbol: string;
  native: number;
  /** Unconfirmed portion of `native`, when the indexer reports it. */
  nativePending: number;
  tokens: TokenBalance[];
  usd: number;
  explorerUrl: string;
  error?: string;
}

const ZERO = { confirmed: 0, unconfirmed: 0 };

// ---------- EVM ----------

async function evmRpc<T>(url: string, method: string, params: unknown[]): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!res.ok) throw new Error(`${method} → ${res.status}`);
  const json = (await res.json()) as { result?: T; error?: { message: string } };
  if (json.error) throw new Error(json.error.message);
  return json.result as T;
}

function balanceOfCalldata(address: string): string {
  return `0x70a08231${address.toLowerCase().replace(/^0x/, "").padStart(64, "0")}`;
}

async function evmAddressBalance(
  address: string,
  enabledStables: string[],
  key: string,
): Promise<{ native: number; tokens: TokenBalance[] }> {
  const tokens: TokenBalance[] = [];
  let native = 0;

  for (const chainKey of EVM_CHAIN_KEYS) {
    const net = getNetwork(chainKey as ChainKind) as EvmNetwork;
    const url = net.rpcUrl(key);
    try {
      const hex = await evmRpc<string>(url, "eth_getBalance", [address, "latest"]);
      const amount = Number(BigInt(hex)) / 1e18;
      if (amount > 0) {
        native += amount;
        tokens.push({ symbol: net.symbol === "bsc" ? "BNB" : "ETH", amount, network: EVM_CHAIN_LABEL[chainKey] });
      }
    } catch {
      /* one chain down shouldn't blank the row */
    }
    for (const stable of net.stables) {
      if (!enabledStables.includes(stable.symbol.toUpperCase())) continue;
      try {
        const hex = await evmRpc<string>(url, "eth_call", [
          { to: stable.address, data: balanceOfCalldata(address) },
          "latest",
        ]);
        if (!hex || hex === "0x") continue;
        const amount = Number(BigInt(hex)) / 10 ** stable.decimals;
        if (amount > 0) {
          tokens.push({ symbol: stable.symbol, amount, network: EVM_CHAIN_LABEL[chainKey] });
        }
      } catch {
        /* skip */
      }
    }
  }
  // Native rows are emitted as tokens (per network); keep `native` as the sum
  // only for display fallback.
  return { native, tokens };
}

// ---------- Solana ----------

async function solanaBalance(address: string, key: string): Promise<{ native: number; tokens: TokenBalance[] }> {
  const net = getNetwork("sol" as ChainKind) as { rpcUrl: (k: string) => string };
  const url = net.rpcUrl(key);
  const call = async <T>(method: string, params: unknown[]): Promise<T> =>
    evmRpc<T>(url, method, params);

  let native = 0;
  const tokens: TokenBalance[] = [];
  try {
    const res = await call<{ value: number }>("getBalance", [address]);
    native = (res?.value ?? 0) / 1e9;
  } catch {
    /* ignore */
  }
  try {
    const res = await call<{
      value: {
        account: {
          data: { parsed: { info: { mint: string; tokenAmount: { uiAmount: number } } } };
        };
      }[];
    }>("getTokenAccountsByOwner", [
      address,
      { programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" },
      { encoding: "jsonParsed" },
    ]);
    const sol = getNetwork("sol" as ChainKind) as { stables: { symbol: string; mint: string }[] };
    for (const acc of res?.value ?? []) {
      const info = acc.account?.data?.parsed?.info;
      if (!info) continue;
      const meta = sol.stables.find((s) => s.mint === info.mint);
      const amount = info.tokenAmount?.uiAmount ?? 0;
      if (meta && amount > 0) tokens.push({ symbol: meta.symbol, amount });
    }
  } catch {
    /* ignore */
  }
  return { native, tokens };
}

// ---------- public API ----------

/**
 * Balance for a single derived/static address on `chain`.
 * `enabledStables` limits which token contracts we query.
 */
export async function getAddressBalance(
  chain: ChainKind,
  index: number,
  address: string,
  enabledStables: string[],
  rates: Map<string, number>,
): Promise<AddressBalance> {
  const net = getNetwork(chain);
  if (!net) throw new Error(`Unsupported chain ${chain}`);
  const alchemyKey = process.env["ALCHEMY_API_KEY"] ?? "";

  const row: AddressBalance = {
    index,
    address,
    nativeSymbol: chain.toUpperCase(),
    native: 0,
    nativePending: 0,
    tokens: [],
    usd: 0,
    explorerUrl:
      "explorerAddr" in net ? (net as { explorerAddr: (a: string) => string }).explorerAddr(address) : "",
  };

  try {
    if (net.kind === "btc-like") {
      const b = await getBtcLikeBalance(net, address);
      row.native = b.confirmed / 10 ** net.decimals;
      row.nativePending = b.unconfirmed / 10 ** net.decimals;
    } else if (net.kind === "evm") {
      row.nativeSymbol = "ETH";
      const { tokens } = await evmAddressBalance(address, enabledStables, alchemyKey);
      row.tokens = tokens;
    } else if (net.kind === "solana") {
      row.nativeSymbol = "SOL";
      const { native, tokens } = await solanaBalance(address, alchemyKey);
      row.native = native;
      row.tokens = tokens;
    } else {
      row.nativeSymbol = "TRX";
    }
  } catch (e) {
    row.error = e instanceof Error ? e.message : "Balance unavailable";
  }

  const nativeRate = rates.get(row.nativeSymbol.toUpperCase()) ?? 0;
  row.usd = (row.native + row.nativePending) * nativeRate;
  for (const t of row.tokens) {
    row.usd += t.amount * (rates.get(t.symbol.toUpperCase()) ?? 0);
  }
  row.usd = Number(row.usd.toFixed(2));
  return row;
}

async function getBtcLikeBalance(net: BtcLikeNetwork, address: string) {
  try {
    const { getAddressBalanceSats } = await import("./chains/btc-like.server");
    return await getAddressBalanceSats(net, address);
  } catch {
    return ZERO;
  }
}

/** USD rates for every symbol a balance page may show, fetched once. */
export async function loadRates(symbols: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  const unique = [...new Set(symbols.map((s) => s.toUpperCase()))];
  await Promise.all(
    unique.map(async (sym) => {
      if (["USDC", "USDT", "DAI", "PYUSD", "TSD"].includes(sym)) {
        map.set(sym, 1);
        return;
      }
      const rate = await getUsdRate(sym).catch(() => 0);
      map.set(sym, rate || 0);
    }),
  );
  return map;
}
