// Tron watcher via Alchemy's TronGrid-compatible HTTP API.
// Fetches native TRX transfers and TRC-20 stablecoin transfers to an address.

import type { TronNetwork } from "./networks";

interface TrxTransfer {
  txID: string;
  block_timestamp: number;
  raw_data?: { contract?: { parameter?: { value?: { amount?: number; to_address?: string; owner_address?: string } } }[] };
  ret?: { contractRet: string }[];
  blockNumber?: number;
}

interface Trc20Transfer {
  transaction_id: string;
  block_timestamp: number;
  from: string;
  to: string;
  value: string; // raw integer string
  token_info: { address: string; decimals: number; symbol: string };
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return (await res.json()) as T;
}

export async function getTronBlockNumber(net: TronNetwork, key: string): Promise<number> {
  const res = await fetch(`${net.apiBase(key)}/wallet/getnowblock`, { method: "POST" });
  if (!res.ok) throw new Error(`getnowblock ${res.status}`);
  const j = (await res.json()) as { block_header?: { raw_data?: { number?: number } } };
  return Number(j.block_header?.raw_data?.number ?? 0);
}

export async function getTronTransfersTo(
  net: TronNetwork,
  key: string,
  address: string,
): Promise<
  {
    txHash: string;
    blockTime: number;
    to: string;
    asset: string;
    rawValue: string;
    decimals: number;
    isNative: boolean;
  }[]
> {
  const base = net.apiBase(key);
  const out: Awaited<ReturnType<typeof getTronTransfersTo>> = [];
  const stableAddrs = new Set(net.stables.map((s) => s.address));

  // Native TRX transfers (last 50 to this address)
  try {
    const j = await fetchJson<{ data: TrxTransfer[] }>(
      `${base}/v1/accounts/${address}/transactions?limit=50&only_to=true`,
    );
    for (const tx of j.data ?? []) {
      const c = tx.raw_data?.contract?.[0]?.parameter?.value;
      if (!c?.amount || !c.to_address) continue;
      if (tx.ret?.[0]?.contractRet !== "SUCCESS") continue;
      out.push({
        txHash: tx.txID,
        blockTime: tx.block_timestamp,
        to: address,
        asset: "TRX",
        rawValue: String(c.amount),
        decimals: 6,
        isNative: true,
      });
    }
  } catch (e) {
    console.error("tron native tx fetch:", (e as Error).message);
  }

  // TRC-20 transfers
  try {
    const j = await fetchJson<{ data: Trc20Transfer[] }>(
      `${base}/v1/accounts/${address}/transactions/trc20?limit=50&only_to=true`,
    );
    for (const tx of j.data ?? []) {
      if (!stableAddrs.has(tx.token_info.address)) continue;
      out.push({
        txHash: tx.transaction_id,
        blockTime: tx.block_timestamp,
        to: tx.to,
        asset: tx.token_info.symbol,
        rawValue: tx.value,
        decimals: tx.token_info.decimals,
        isNative: false,
      });
    }
  } catch (e) {
    console.error("tron trc20 fetch:", (e as Error).message);
  }

  return out;
}
