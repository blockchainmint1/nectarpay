// Omni Layer (Class C / OP_RETURN) decoding for BTC-like chains.
//
// Used for Texas Stable Dollar (TSD, property #39) on TEXITcoin. There is no
// public Omni RPC we can rely on, so we decode the marker payload straight out
// of the Esplora tx data we already fetch for the native chain watcher.
//
// Class C payload layout (hex, inside the OP_RETURN script):
//   6a <len> 6f6d6e69 <version:2> <type:2> <propertyId:4> <amount:8>
//   ("6f6d6e69" = "omni")
// Transaction types we credit:
//   0x0000 (0)  simple send
//   0x0037 (55) grant tokens
//
// Recipient (Omni "reference address"): the receiving address we are watching
// must appear as a non-data output AND must not be one of the input addresses
// (our derived invoice addresses never spend, so this is safe and avoids
// mistaking a sender's change output for a credit).

import type { BtcLikeNetwork } from "./networks";
import type { EsploraTx } from "./btc-like.server";

const OMNI_MARKER = "6f6d6e69";
const CREDIT_TYPES = new Set([0x0000, 0x0037]);

export interface OmniPayload {
  version: number;
  type: number;
  propertyId: number;
  /** Raw integer amount in the property's smallest unit. */
  amount: bigint;
}

/** Decode the Omni payload from an OP_RETURN scriptpubkey hex, if present. */
export function decodeOmniScript(scriptHex: string): OmniPayload | null {
  const hex = (scriptHex ?? "").toLowerCase();
  if (!hex.startsWith("6a")) return null;
  const idx = hex.indexOf(OMNI_MARKER);
  if (idx === -1) return null;
  const body = hex.slice(idx + OMNI_MARKER.length);
  if (body.length < 32) return null; // 2+2+4+8 bytes
  const version = parseInt(body.slice(0, 4), 16);
  const type = parseInt(body.slice(4, 8), 16);
  const propertyId = parseInt(body.slice(8, 16), 16);
  const amount = BigInt(`0x${body.slice(16, 32)}`);
  if (!Number.isFinite(version) || !Number.isFinite(type) || !Number.isFinite(propertyId)) {
    return null;
  }
  return { version, type, propertyId, amount };
}

/** Find the Omni payload of a transaction, if any. */
export function omniPayloadOf(tx: EsploraTx): OmniPayload | null {
  for (const v of tx.vout) {
    if (!v.scriptpubkey) continue;
    const p = decodeOmniScript(v.scriptpubkey);
    if (p) return p;
  }
  return null;
}

export interface OmniCredit {
  txid: string;
  vout: number;
  /** Decimal token amount (already scaled by the property's decimals). */
  amount: number;
  confirmations: number;
  blockTime: number | null;
}

/**
 * Incoming Omni credits of `propertyId` to `address` found in `txs`.
 * Mirrors extractIncoming() for the native asset.
 */
export function extractOmniIncoming(
  txs: EsploraTx[],
  address: string,
  propertyId: number,
  decimals: number,
  tipHeight: number,
): OmniCredit[] {
  const out: OmniCredit[] = [];
  for (const tx of txs) {
    const payload = omniPayloadOf(tx);
    if (!payload) continue;
    if (payload.propertyId !== propertyId) continue;
    if (!CREDIT_TYPES.has(payload.type)) continue;

    // Skip if the watched address funded the transaction (change output).
    const inputAddrs = new Set(
      tx.vin.map((i) => i.prevout?.scriptpubkey_address).filter(Boolean) as string[],
    );
    if (inputAddrs.has(address)) continue;

    const voutIdx = tx.vout.findIndex((v) => v.scriptpubkey_address === address);
    if (voutIdx === -1) continue;

    const confs =
      tx.status.confirmed && tx.status.block_height
        ? Math.max(0, tipHeight - tx.status.block_height + 1)
        : 0;
    out.push({
      txid: tx.txid,
      vout: voutIdx,
      amount: Number(payload.amount) / 10 ** decimals,
      confirmations: confs,
      blockTime: tx.status.block_time ?? null,
    });
  }
  return out;
}

/** Convenience: fetch + decode Omni credits for one address. */
export async function getOmniCredits(
  net: BtcLikeNetwork,
  address: string,
  propertyId: number,
  decimals: number,
  tipHeight: number,
): Promise<OmniCredit[]> {
  const { getAddressTxs } = await import("./btc-like.server");
  const txs = await getAddressTxs(net, address).catch(() => [] as EsploraTx[]);
  return extractOmniIncoming(txs, address, propertyId, decimals, tipHeight);
}
