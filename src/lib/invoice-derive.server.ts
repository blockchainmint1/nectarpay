// Shared invoice-derivation helper: given a store + chain (+ optional stable
// token symbol), derive the next receiving address, fetch a USD rate, and
// compute the crypto amount. Used by the hosted checkout's chain picker and
// by the public invoice API.
//
// For stablecoins (USDC / USDT / PYUSD), the receiving address is the same
// underlying chain address — the difference is which token contract /
// SPL mint the watcher monitors. Rate is pegged at $1.

import { getNetwork, getStable, type ChainKind } from "@/lib/chains/networks";
import {
  deriveBtcLikeAddress,
  deriveEvmAddress,
  deriveTronAddress,
} from "@/lib/chains/derive.server";
import { getUsdRate } from "@/lib/rates.functions";

export interface DeriveResult {
  address: string;
  cryptoAmount: number;
  rate: number;
  index: number;
  chainConfigId: string;
}

export async function deriveInvoiceAddress(
  storeId: string,
  chain: ChainKind,
  fiatAmount: number,
  tokenSymbol: string | null = null,
): Promise<DeriveResult> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: cfg } = await supabaseAdmin
    .from("chain_configs")
    .select("id, chain, xpub_or_address, xpub, next_address_index, enabled, stables")
    .eq("store_id", storeId)
    .eq("chain", chain)
    .maybeSingle();
  if (!cfg || !cfg.enabled) {
    throw new Error(`Chain '${chain}' is not configured for this store.`);
  }

  const net = getNetwork(chain);
  if (!net) throw new Error("Unsupported chain.");

  // Validate stable opt-in.
  if (tokenSymbol) {
    const enabledStables = ((cfg.stables ?? []) as string[]).map((s) => s.toUpperCase());
    if (!enabledStables.includes(tokenSymbol.toUpperCase())) {
      throw new Error(`${tokenSymbol} is not enabled on ${chain} for this store.`);
    }
    if (!getStable(chain, tokenSymbol)) {
      throw new Error(`${tokenSymbol} isn't supported on ${chain}.`);
    }
  }

  let address: string;
  let index = cfg.next_address_index ?? 0;
  const xpub = cfg.xpub ?? cfg.xpub_or_address;

  if (net.kind === "btc-like") {
    address = deriveBtcLikeAddress(xpub, net, index);
  } else if (net.kind === "evm") {
    address = deriveEvmAddress(xpub, net, index);
  } else if (net.kind === "tron") {
    address = xpub.startsWith("T") ? xpub : deriveTronAddress(xpub, index);
    if (xpub.startsWith("T")) index = 0;
  } else {
    address = cfg.xpub_or_address;
    index = 0;
  }

  // Rate: stable = $1; otherwise look up the chain's native asset.
  const baseSymbol = tokenSymbol
    ? tokenSymbol
    : chain === "base" ? "eth"
    : chain === "tron" ? "trx"
    : chain === "sol"  ? "sol"
    : chain;
  const rate = await getUsdRate(baseSymbol).catch(() => 0);
  if (!rate || rate <= 0) throw new Error("Could not fetch exchange rate.");
  const cryptoAmount = Number((fiatAmount / rate).toFixed(8));

  // Bump address counter + log derivation (skip for static single addresses).
  if (net.kind !== "solana" && !(net.kind === "tron" && xpub.startsWith("T"))) {
    await supabaseAdmin
      .from("chain_configs")
      .update({ next_address_index: index + 1, next_derivation_index: index + 1 })
      .eq("id", cfg.id);
    await supabaseAdmin
      .from("derived_addresses")
      .insert({
        chain_config_id: cfg.id,
        store_id: storeId,
        address,
        address_index: index,
      });
  }

  return { address, cryptoAmount, rate, index, chainConfigId: cfg.id };
}
