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
  let recycledEvmAddress = false;
  const xpub = cfg.xpub ?? cfg.xpub_or_address;

  if (net.kind === "btc-like") {
    address = deriveBtcLikeAddress(xpub, net, index);
  } else if (net.kind === "evm") {
    // EVM is account-based — each derived address must be swept individually
    // (gas per address per token). When an invoice expires unpaid, the index
    // is wasted forever unless we recycle it. Try to reuse an address from a
    // prior expired/cancelled invoice on this store+chain that has NEVER
    // received funds (no pending/detected/underpaid/confirmed/overpaid
    // invoice ever landed on it). Falls back to fresh derivation.
    const recycled = await findRecyclableEvmAddress(supabaseAdmin, storeId, chain);
    if (recycled) {
      address = recycled.address;
      index = recycled.address_index ?? index;
      recycledEvmAddress = true;
    } else {
      address = deriveEvmAddress(xpub, net, index);
    }
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
  const baseAmount = fiatAmount / rate;

  // ---- Amount-nonce disambiguation ----
  // For chains where the receiving address is shared across invoices (Solana
  // always; Tron in static-T-address mode), we can't tell two pending invoices
  // apart by address alone. Nudge the crypto amount with a unique 3-digit nonce
  // in decimal places 3–5 (e.g. 69.65 USDT → 69.65042 USDT) so the watcher can
  // match incoming payments by (address, token, amount±tolerance).
  const isSharedAddress =
    net.kind === "solana" || (net.kind === "tron" && xpub.startsWith("T"));
  let cryptoAmount: number;
  if (isSharedAddress) {
    cryptoAmount = await applyAmountNonce(
      supabaseAdmin,
      chain,
      address,
      tokenSymbol,
      baseAmount,
    );
  } else {
    cryptoAmount = Number(baseAmount.toFixed(8));
  }

  // Bump address counter + log derivation. Skip for:
  //   - shared-address chains (Solana, Tron-static)
  //   - recycled EVM addresses (counter already advanced when first derived;
  //     derived_addresses row already exists)
  const isStaticShared =
    net.kind === "solana" || (net.kind === "tron" && xpub.startsWith("T"));
  if (!isStaticShared && !recycledEvmAddress) {
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

// 3-digit nonce in decimal places 3–5 of the crypto amount.
// final = ceil(base*100)/100 + nonce/1e5
// Picks a nonce in [1..999] that isn't already in use among currently-pending
// invoices on the same (chain, address, token_symbol). Caller invariant: the
// returned amount is >= base (we ceil cents before adding the nonce), so we
// never underbill the customer.
export const AMOUNT_NONCE_TOLERANCE = 0.000005; // half a step at 5 decimals

async function applyAmountNonce(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseAdmin: any,
  chain: string,
  address: string,
  tokenSymbol: string | null,
  baseAmount: number,
): Promise<number> {
  const { data: pend } = await supabaseAdmin
    .from("invoices")
    .select("crypto_amount, token_symbol")
    .eq("chain", chain)
    .eq("address", address)
    .in("status", ["pending", "detected", "underpaid"])
    .not("crypto_amount", "is", null);

  const used = new Set<number>();
  for (const r of (pend ?? []) as Array<{ crypto_amount: number; token_symbol: string | null }>) {
    const sameToken = (r.token_symbol ?? null) === (tokenSymbol ?? null);
    if (!sameToken) continue;
    // Extract the last 3 digits at positions 3–5 (the nonce slot).
    const milli5 = Math.round(Number(r.crypto_amount) * 1e5);
    used.add(milli5 % 1000);
  }

  // Find an unused nonce in [1..999]. 0 is reserved (means "no nonce").
  let nonce = -1;
  for (let i = 1; i < 1000; i++) {
    // Start from a pseudo-random offset so concurrent inserts spread out.
    const candidate = ((Math.floor(Math.random() * 999) + i) % 999) + 1;
    if (!used.has(candidate)) {
      nonce = candidate;
      break;
    }
  }
  if (nonce < 0) {
    // Pool exhausted (1000 pending invoices on one address+token — extremely
    // unlikely). Fall back to base amount without nonce.
    return Number(baseAmount.toFixed(8));
  }

  const centsCeil = Math.ceil(baseAmount * 100); // round up to next cent
  const adjusted = centsCeil / 100 + nonce / 1e5;
  return Number(adjusted.toFixed(8));
}

