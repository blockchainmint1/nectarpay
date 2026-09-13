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
  stables: string[];
  /** False when the store hasn't linked a wallet for this chain yet. */
  configured: boolean;
}

const EVM_SHARED = ["eth", "base", "bsc"] as const;

/** Pick the chain_config row that carries a usable key for a chain, with the
 * EVM chains falling back to each other (one xpub covers all three). */
function pickConfigRow(
  rows: { chain: string; xpub: string | null; xpub_or_address: string | null; enabled: boolean; next_address_index: number | null; stables: unknown }[],
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
  .handler(async ({ data, context }): Promise<{ chains: BalanceChainSummary[] }> => {
    const { data: rows, error } = await context.supabase
      .from("chain_configs")
      .select("chain, xpub, xpub_or_address, enabled, next_address_index, stables")
      .eq("store_id", data.storeId);
    if (error) throw new Error(error.message);

    const netModule = await import("./chains/networks");
    const allNetworks = netModule.ALL_NETWORKS as Record<
      string,
      { kind: string; name: string }
    >;

    const chains: BalanceChainSummary[] = [];
    for (const [chain, net] of Object.entries(allNetworks)) {
      if (chain === "lightning") continue;
      const row = pickConfigRow(rows ?? [], chain);
      const key = (row?.xpub || row?.xpub_or_address || "").trim();
      const configured = !!key;
      const derived =
        net.kind === "btc-like" ||
        net.kind === "evm" ||
        (net.kind === "tron" && !key.startsWith("T") && configured);
      chains.push({
        chain,
        name: net.name,
        kind: net.kind,
        derived: configured ? derived : net.kind !== "solana" && net.kind !== "tron",
        nextIndex: row?.next_address_index ?? 1,
        stables: configured ? ((row?.stables ?? []) as string[]).map((s) => s.toUpperCase()) : [],
        configured,
      });
    }
    return { chains };
  });

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
    }): Promise<{ addresses: AddressBalance[]; derived: boolean; totalUsd: number }> => {
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

      const { deriveBtcLikeAddress, deriveEvmAddress, deriveTronAddress } = await import(
        "./chains/derive.server"
      );
      const { getAddressBalance, loadRates } = await import("./balances.server");

      const stables = ((cfg.stables ?? []) as string[]).map((s) => s.toUpperCase());

      let derived = true;
      const entries: { index: number; address: string }[] = [];
      if (net.kind === "btc-like") {
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
        net.kind === "evm" ? "ETH" : net.kind === "solana" ? "SOL" : net.kind === "tron" ? "TRX" : data.chain;
      const rates = await loadRates([nativeSymbol, "BNB", ...stables]);

      const addresses: AddressBalance[] = [];
      for (const e of entries) {
        addresses.push(
          await getAddressBalance(data.chain as never, e.index, e.address, stables, rates),
        );
      }
      const totalUsd = Number(addresses.reduce((s, a) => s + a.usd, 0).toFixed(2));
      return { addresses, derived, totalUsd };
    },
  );
