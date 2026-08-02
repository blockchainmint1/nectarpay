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

// Trezor's public Blockbook nodes sit behind Cloudflare and reject server-side
// traffic, so each chain's endpoint is configurable. Resolution order:
//   1) BLOCKBOOK_<CHAIN>_URL — a self-hosted or dedicated Blockbook instance
//   2) NOWNODES_API_KEY      — NOWNodes' hosted Blockbook, keyed per request
//   3) the network's default public host (best-effort)
const ENV_BASE_VAR: Record<string, string> = {
  doge: "BLOCKBOOK_DOGE_URL",
  bch: "BLOCKBOOK_BCH_URL",
  dash: "BLOCKBOOK_DASH_URL",
  ltc: "BLOCKBOOK_LTC_URL",
};

// NOWNodes serves Blockbook REST on dedicated "*book" hosts; the bare
// <coin>.nownodes.io hosts are JSON-RPC nodes and reject these paths.
const NOWNODES_HOST: Record<string, string> = {
  doge: "https://dogebook.nownodes.io",
  bch: "https://bchbook.nownodes.io",
  dash: "https://dashbook.nownodes.io",
  ltc: "https://ltcbook.nownodes.io",
  btc: "https://btcbook.nownodes.io",
};

function resolveEndpoint(net: BtcLikeNetwork): { base: string; headers: Record<string, string> } {
  const envVar = ENV_BASE_VAR[net.symbol];
  const override = envVar ? process.env[envVar] : undefined;
  if (override) return { base: override.replace(/\/+$/, ""), headers: {} };

  const key = process.env["NOWNODES_API_KEY"];
  const host = NOWNODES_HOST[net.symbol];
  if (key && host) return { base: host, headers: { "api-key": key } };

  return { base: net.esploraBase, headers: {} };
}

async function fetchJson<T>(net: BtcLikeNetwork, path: string): Promise<T> {
  const { base, headers } = resolveEndpoint(net);
  const url = `${base}${path}`;
  const res = await fetch(url, { headers: { Accept: "application/json", ...headers } });
  if (!res.ok) {
    throw new Error(
      `blockbook ${net.symbol}: ${res.status} — set ${ENV_BASE_VAR[net.symbol] ?? "an indexer URL"} or NOWNODES_API_KEY`,
    );
  }
  return (await res.json()) as T;
}

export async function getBlockbookTipHeight(net: BtcLikeNetwork): Promise<number> {
  const json = await fetchJson<BlockbookStatus>(net, "/api/v2");
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
    net,
    `/api/v2/address/${encodeURIComponent(address)}?details=txs&pageSize=50`,
  );
  return (json.transactions ?? []).map(toEsploraTx);
}
