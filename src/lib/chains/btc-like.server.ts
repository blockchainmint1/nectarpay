// UTXO-chain watcher client. Speaks Esplora natively (BTC via mempool.space,
// TXC via mempool.texitcoin.org, LTC via litecoinspace.org) and transparently
// falls back to the Blockbook adapter for chains with no public Esplora
// (DOGE, BCH, DASH). Both produce the same `EsploraTx` shape.

import type { BtcLikeNetwork } from "./networks";

export interface EsploraTxStatus {
  confirmed: boolean;
  block_height?: number;
  block_time?: number;
}

export interface EsploraTx {
  txid: string;
  vin: { prevout?: { scriptpubkey_address?: string; value: number } }[];
  vout: { scriptpubkey_address?: string; scriptpubkey?: string; value: number }[];
  status: EsploraTxStatus;
}


async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return (await res.json()) as T;
}

export async function getTipHeight(net: BtcLikeNetwork): Promise<number> {
  if (net.indexer === "blockbook") {
    const { getBlockbookTipHeight } = await import("./blockbook.server");
    return getBlockbookTipHeight(net);
  }
  const res = await fetch(`${net.esploraBase}/blocks/tip/height`);
  if (!res.ok) throw new Error(`tip height ${res.status}`);
  return Number(await res.text());
}

export async function getAddressTxs(net: BtcLikeNetwork, address: string): Promise<EsploraTx[]> {
  if (net.indexer === "blockbook") {
    const { getBlockbookAddressTxs } = await import("./blockbook.server");
    return getBlockbookAddressTxs(net, address);
  }
  const [confirmedOrRecent, mempool] = await Promise.allSettled([
    fetchJson<EsploraTx[]>(`${net.esploraBase}/address/${address}/txs`),
    fetchJson<EsploraTx[]>(`${net.esploraBase}/address/${address}/txs/mempool`),
  ]);
  if (confirmedOrRecent.status === "rejected" && mempool.status === "rejected") {
    throw confirmedOrRecent.reason;
  }
  const byTxid = new Map<string, EsploraTx>();
  for (const tx of confirmedOrRecent.status === "fulfilled" ? confirmedOrRecent.value : []) {
    byTxid.set(tx.txid, tx);
  }
  for (const tx of mempool.status === "fulfilled" ? mempool.value : []) {
    byTxid.set(tx.txid, tx);
  }
  return [...byTxid.values()];
}

/**
 * Address equality that tolerates CashAddr prefixes ("bitcoincash:q…" vs
 * "q…"). Base58 chains fall back to exact, case-sensitive comparison.
 */
function sameAddress(a: string | undefined, b: string): boolean {
  if (!a) return false;
  if (a === b) return true;
  if (!a.includes(":") && !b.includes(":")) return false;
  const strip = (x: string) => (x.includes(":") ? x.split(":")[1] : x).toLowerCase();
  return strip(a) === strip(b);
}

/**
 * Returns incoming credits to `address` from `txs`. Each entry is one vout
 * paying the address. `confirmations` is computed against `tipHeight`; 0 = mempool.
 */
export function extractIncoming(
  txs: EsploraTx[],
  address: string,
  tipHeight: number,
): {
  txid: string;
  vout: number;
  amountSats: number;
  confirmations: number;
  blockTime: number | null;
}[] {
  const out: ReturnType<typeof extractIncoming> = [];
  for (const tx of txs) {
    tx.vout.forEach((v, idx) => {
      if (!sameAddress(v.scriptpubkey_address, address)) return;
      const confs =
        tx.status.confirmed && tx.status.block_height
          ? Math.max(0, tipHeight - tx.status.block_height + 1)
          : 0;
      out.push({
        txid: tx.txid,
        vout: idx,
        amountSats: v.value,
        confirmations: confs,
        blockTime: tx.status.block_time ?? null,
      });
    });
  }
  return out;
}
