// Blockbook (Trezor) indexer adapter.
//
// Dogecoin, Bitcoin Cash and Dash have no reliable public Esplora instance,
// but all three are served by Blockbook, which exposes a stable REST API.
// This module normalizes Blockbook responses into the same `EsploraTx` shape
// the watcher already consumes, so no per-chain branching is needed upstream.

import type { BtcLikeNetwork } from "./networks";
import type { EsploraTx } from "./btc-like.server";

interface BlockbookVin {
  addresses?: string[] | null;
  value?: string;
  isAddress?: boolean;
}

interface BlockbookVout {
  value?: string;
  n?: number;
  hex?: string;
  addresses?: string[] | null;
  isAddress?: boolean;
}

interface BlockbookTx {
  txid: string;
  vin?: BlockbookVin[];
  vout?: BlockbookVout[];
  blockHeight?: number;
  blockTime?: number;
  confirmations?: number;
}

interface BlockbookAddress {
  transactions?: BlockbookTx[];
  txids?: string[];
}

interface BlockbookStatus {
  blockbook?: { bestHeight?: number };
  backend?: { blocks?: number };
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return (await res.json()) as T;
}

export async function getBlockbookTipHeight(net: BtcLikeNetwork): Promise<number> {
  const json = await fetchJson<BlockbookStatus>(`${net.esploraBase}/api/v2`);
  const h = json.blockbook?.bestHeight ?? json.backend?.blocks;
  if (!h || !Number.isFinite(h)) throw new Error("blockbook: no tip height");
  return Number(h);
}

/** Normalize a Blockbook tx into the Esplora shape used by the watcher. */
function toEsploraTx(tx: BlockbookTx): EsploraTx {
  const confirmed = (tx.confirmations ?? 0) > 0 && (tx.blockHeight ?? -1) > 0;
  return {
    txid: tx.txid,
    vin: (tx.vin ?? []).map((i) => ({
      prevout: {
        scriptpubkey_address: i.addresses?.[0],
        value: Number(i.value ?? 0),
      },
    })),
    vout: (tx.vout ?? []).map((o) => ({
      scriptpubkey_address: o.addresses?.[0],
      scriptpubkey: o.hex,
      value: Number(o.value ?? 0),
    })),
    status: {
      confirmed,
      ...(confirmed ? { block_height: tx.blockHeight } : {}),
      ...(tx.blockTime ? { block_time: tx.blockTime } : {}),
    },
  };
}

/**
 * Confirmed + mempool transactions touching `address`. Blockbook returns both
 * in one call (unconfirmed entries carry confirmations: 0).
 */
export async function getBlockbookAddressTxs(
  net: BtcLikeNetwork,
  address: string,
): Promise<EsploraTx[]> {
  const json = await fetchJson<BlockbookAddress>(
    `${net.esploraBase}/api/v2/address/${encodeURIComponent(address)}?details=txs&pageSize=50`,
  );
  return (json.transactions ?? []).map(toEsploraTx);
}
