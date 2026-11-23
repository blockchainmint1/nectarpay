// Merchant-facing wallet balances: derive receive addresses from the store's
// saved xpubs and read live balances, paged by derivation index.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { AddressBalance } from "./balances.server";

const ListInput = z.object({ storeId: z.string().uuid() });

export interface BalanceChainSummary {
  chain: string;
  name: string;
  kind: string;
  /** Addresses are derived from an xpub (paged) vs a single static address. */
  derived: boolean;
  nextIndex: number;
  /** First sale address to count: #0 for single-address EVM stores, else #1. */
  firstIndex: number;
  /** Highest address any sale has used (from the counter and the sales themselves). */
  lastIndex: number;
  stables: string[];
  /** False when the store hasn't linked a wallet for this chain yet. */
  configured: boolean;
  /** Retired platform-wide: never offered, only watched for mistaken payments. */
  retired: boolean;
  /** Switched on for new sales. */
  enabled: boolean;
}

export interface PaidSalesSummary {
  count: number;
  /** Sum of dollar-priced paid sales. */
  usd: number;
  /** False when some paid sales were priced in another currency. */
  allUsd: boolean;
}

const EVM_SHARED = ["eth", "base", "bsc"] as const;

/** Extended public keys are ~111 characters; a pasted single address is far shorter. */
export function isExtendedKey(key: string): boolean {
  return key.length >= 100 && !key.startsWith("0x");
}

/** Pick the chain_config row that carries a usable key for a chain, with the
 * EVM chains falling back to each other (one xpub covers all three). */
function pickConfigRow(
  rows: {
    chain: string;
    xpub: string | null;
    xpub_or_address: string | null;
    enabled: boolean;
    next_address_index: number | null;
    stables: unknown;
  }[],
  chain: string,
) {
  const direct = rows.find((r) => r.chain === chain);
  if (direct) return direct;
  if ((EVM_SHARED as readonly string[]).includes(chain)) {
    return rows.find((r) => (EVM_SHARED as readonly string[]).includes(r.chain));
  }
  return undefined;
}

export const listBalanceChains = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ListInput.parse(d))
  .handler(
    async ({
      data,
      context,
    }): Promise<{ chains: BalanceChainSummary[]; paidSales: PaidSalesSummary }> => {
    const { data: rows, error } = await context.supabase
      .from("chain_configs")
      .select("chain, xpub, xpub_or_address, enabled, next_address_index, stables")
      .eq("store_id", data.storeId);
    if (error) throw new Error(error.message);

    const { data: store } = await context.supabase
      .from("stores")
      .select("evm_address_rotation")
      .eq("id", data.storeId)
      .maybeSingle();
    const evmSingle =
      (store as { evm_address_rotation?: boolean } | null)?.evm_address_rotation === false;

    // Highest address index any sale on this chain (or EVM family) has used.
    const maxSaleIndex = async (chains: string[]): Promise<number> => {
      const { data: inv } = await context.supabase
        .from("invoices")
        .select("address_index")
        .eq("store_id", data.storeId)
        .in("chain", chains as never[])
        .not("address_index", "is", null)
        .order("address_index", { ascending: false })
        .limit(1);
      return Number((inv?.[0] as { address_index?: number } | undefined)?.address_index ?? 0);
    };

    const netModule = await import("./chains/networks");
    const { isChainRetired } = await import("./network-switch");
    const allNetworks = netModule.ALL_NETWORKS as Record<string, { kind: string; name: string }>;

    const chains: BalanceChainSummary[] = [];
    for (const [chain, net] of Object.entries(allNetworks)) {
      if (chain === "lightning") continue;
      const row = pickConfigRow(rows ?? [], chain);
      const key = (row?.xpub || row?.xpub_or_address || "").trim();
      const configured = !!key;
      const derived = configured
        ? ((net.kind === "btc-like" || net.kind === "evm") && isExtendedKey(key)) ||
          (net.kind === "tron" && !key.startsWith("T"))
        : net.kind !== "solana" && net.kind !== "tron";
      const isEvm = net.kind === "evm";
      const nextIndex = row?.next_address_index ?? 1;
      const firstIndex = isEvm && evmSingle ? 0 : 1;
      const lastIndex =
        configured && derived
          ? Math.max(
              firstIndex,
              nextIndex - 1,
              await maxSaleIndex(
                (EVM_SHARED as readonly string[]).includes(chain) ? [...EVM_SHARED] : [chain],
              ),
            )
          : 0;
      chains.push({
        chain,
        name: net.name,
        kind: net.kind,
        derived,
        nextIndex,
        firstIndex: derived ? firstIndex : 0,
        lastIndex,
        stables: configured ? ((row?.stables ?? []) as string[]).map((s) => s.toUpperCase()) : [],
        configured,
        retired: isChainRetired(chain),
        enabled: !!row?.enabled && !isChainRetired(chain),
      });
    }

    // Every paid sale on record, to compare with what the wallets hold now.
    const paidSales: PaidSalesSummary = { count: 0, usd: 0, allUsd: true };
    for (let from = 0; from < 50_000; from += 1000) {
      const { data: inv, error: invErr } = await context.supabase
        .from("invoices")
        .select("fiat_amount, fiat_currency")
        .eq("store_id", data.storeId)
        .in("status", ["confirmed", "overpaid"])
        .order("created_at", { ascending: true })
        .range(from, from + 999);
      if (invErr) break;
      for (const r of inv ?? []) {
        paidSales.count++;
        if ((r.fiat_currency ?? "USD").toUpperCase() === "USD") paidSales.usd += Number(r.fiat_amount ?? 0);
        else paidSales.allUsd = false;
      }
      if ((inv ?? []).length < 1000) break;
    }
    paidSales.usd = Number(paidSales.usd.toFixed(2));
    return { chains, paidSales };
    },
  );

const PageInput = z.object({
  storeId: z.string().uuid(),
  chain: z.string().min(2),
  start: z.number().int().min(0).default(0),
  count: z.number().int().min(1).max(20).default(5),
});

export const getChainBalances = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => PageInput.parse(d))
  .handler(
    async ({
      data,
      context,
    }): Promise<{
      addresses: AddressBalance[];
      derived: boolean;
      totalUsd: number;
      /** USD price used for each coin on this page (0 = no live price). */
      rates: Record<string, number>;
    }> => {
      const isEvm = (EVM_SHARED as readonly string[]).includes(data.chain);
      let query = context.supabase
        .from("chain_configs")
        .select("chain, xpub, xpub_or_address, stables")
        .eq("store_id", data.storeId)
        .limit(5);
      query = isEvm
        ? query.in("chain", EVM_SHARED as unknown as never[])
        : query.eq("chain", data.chain as never);
      const { data: cfgs, error } = await query;
      if (error) throw new Error(error.message);
      const cfg =
        (cfgs ?? []).find((c) => c.chain === data.chain) ??
        (cfgs ?? []).find((c) => (c.xpub || c.xpub_or_address || "").trim());
      if (!cfg) throw new Error("Chain not configured for this store.");

      const key = (cfg.xpub || cfg.xpub_or_address || "").trim();
      if (!key) throw new Error("No wallet key saved for this chain.");

      const { getNetwork } = await import("./chains/networks");
      const net = getNetwork(data.chain as never);
      if (!net) throw new Error("Unsupported chain.");

      const { deriveBtcLikeAddress, deriveEvmAddress, deriveTronAddress } =
        await import("./chains/derive.server");
      const { getAddressBalance, loadRates, evmNativeSymbol } = await import("./balances.server");

      // EVM: read every stablecoin we know on this network, not only the ones
      // switched on for checkout — money that arrived is money in the wallet.
      const stables =
        net.kind === "evm"
          ? net.stables.map((s) => s.symbol.toUpperCase())
          : ((cfg.stables ?? []) as string[]).map((s) => s.toUpperCase());

      let derived = true;
      const entries: { index: number; address: string }[] = [];
      if ((net.kind === "btc-like" || net.kind === "evm") && !isExtendedKey(key)) {
        // A single pasted address (e.g. a Fast Start coin), not a wallet key.
        derived = false;
        entries.push({ index: 0, address: key });
      } else if (net.kind === "btc-like") {
        for (let i = 0; i < data.count; i++) {
          const idx = data.start + i;
          entries.push({ index: idx, address: deriveBtcLikeAddress(key, net, idx) });
        }
      } else if (net.kind === "evm") {
        for (let i = 0; i < data.count; i++) {
          const idx = data.start + i;
          entries.push({ index: idx, address: deriveEvmAddress(key, net, idx) });
        }
      } else if (net.kind === "tron" && !key.startsWith("T")) {
        for (let i = 0; i < data.count; i++) {
          const idx = data.start + i;
          entries.push({ index: idx, address: deriveTronAddress(key, idx) });
        }
      } else {
        derived = false;
        entries.push({ index: 0, address: key });
      }

      const nativeSymbol =
        net.kind === "evm"
          ? evmNativeSymbol(data.chain)
          : net.kind === "solana"
            ? "SOL"
            : net.kind === "tron"
              ? "TRX"
              : data.chain;
      const omniSymbols =
        net.kind === "btc-like" ? (net.omniStables ?? []).map((t) => t.symbol) : [];
      const rates = await loadRates([nativeSymbol, ...stables, ...omniSymbols]);

      // A few at a time: fast, without tripping the free indexers' rate limits.
      const addresses: AddressBalance[] = [];
      for (let i = 0; i < entries.length; i += 5) {
        const batch = await Promise.all(
          entries
            .slice(i, i + 5)
            .map((e) => getAddressBalance(data.chain as never, e.index, e.address, stables, rates)),
        );
        addresses.push(...batch);
      }
      const totalUsd = Number(addresses.reduce((s, a) => s + a.usd, 0).toFixed(2));
      return { addresses, derived, totalUsd, rates: Object.fromEntries(rates) };
    },
  );
