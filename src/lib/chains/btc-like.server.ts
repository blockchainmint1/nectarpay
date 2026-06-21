// Esplora-compatible watcher used for both BTC (mempool.space) and TXC
// (mempool.texitcoin.org). Same API shape.

import type { BtcLikeNetwork } from "./networks";

export interface EsploraTxStatus {
  confirmed: boolean;
  block_height?: number;
  block_time?: number;
}

export interface EsploraTx {
  txid: string;
  vin: { prevout?: { scriptpubkey_address?: string; value: number } }[];
  vout: { scriptpubkey_address?: string; value: number }[];
  status: EsploraTxStatus;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return (await res.json()) as T;
}

export async function getTipHeight(net: BtcLikeNetwork): Promise<number> {
  const res = await fetch(`${net.esploraBase}/blocks/tip/height`);
  if (!res.ok) throw new Error(`tip height ${res.status}`);
  return Number(await res.text());
}

export async function getAddressTxs(net: BtcLikeNetwork, address: string): Promise<EsploraTx[]> {
  return fetchJson<EsploraTx[]>(`${net.esploraBase}/address/${address}/txs`);
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
      if (v.scriptpubkey_address !== address) return;
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
