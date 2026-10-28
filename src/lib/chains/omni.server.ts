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
//   0x0007 (7)  send-to-many: <propertyId:4> <count:1> then count x
//               (<outputIndex:1> <amount:8>). Only the outputs pointing at
//               the watched address are credited (eGiving community split).
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
  /** Send-to-many (type 7) recipients: vout index → raw amount. */
  outputs?: Array<{ vout: number; amount: bigint }>;
}

export const SEND_TO_MANY = 0x0007;

/** Decode the Omni payload from an OP_RETURN scriptpubkey hex, if present. */
export function decodeOmniScript(scriptHex: string): OmniPayload | null {
  const hex = (scriptHex ?? "").toLowerCase();
  if (!hex.startsWith("6a")) return null;
  const idx = hex.indexOf(OMNI_MARKER);
  if (idx === -1) return null;
  const body = hex.slice(idx + OMNI_MARKER.length);
  if (body.length < 16) return null;
  const version = parseInt(body.slice(0, 4), 16);
  const type = parseInt(body.slice(4, 8), 16);
  const propertyId = parseInt(body.slice(8, 16), 16);
  if (type === SEND_TO_MANY) {
    const count = parseInt(body.slice(16, 18), 16);
    if (!Number.isFinite(count) || count < 1 || count > 255) return null;
    if (body.length < 18 + count * 18) return null;
    const outputs: Array<{ vout: number; amount: bigint }> = [];
    let total = 0n;
    for (let i = 0; i < count; i++) {
      const off = 18 + i * 18;
      const vout = parseInt(body.slice(off, off + 2), 16);
      const amount = BigInt(`0x${body.slice(off + 2, off + 18)}`);
      outputs.push({ vout, amount });
      total += amount;
    }
    if (!Number.isFinite(version) || !Number.isFinite(propertyId)) return null;
    return { version, type, propertyId, amount: total, outputs };
  }
  if (body.length < 32) return null; // 2+2+4+8 bytes
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
  /** True when this credit came from a send-to-many (split) transaction. */
  sendToMany?: boolean;
  /** Every send-to-many recipient (address + decimal amount), for split checks. */
  splitRecipients?: Array<{ address: string | null; amount: number }>;
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
    const isMany = payload.type === SEND_TO_MANY;
    if (!isMany && !CREDIT_TYPES.has(payload.type)) continue;

    // Skip if the watched address funded the transaction (change output).
    const inputAddrs = new Set(
      tx.vin.map((i) => i.prevout?.scriptpubkey_address).filter(Boolean) as string[],
    );
    if (inputAddrs.has(address)) continue;

    let voutIdx: number;
    let raw: bigint;
    if (isMany) {
      // Only the slices addressed to us; an index may repeat, so sum them.
      const mine = (payload.outputs ?? []).filter((o) => tx.vout[o.vout]?.scriptpubkey_address === address);
      if (!mine.length) continue;
      voutIdx = mine[0].vout;
      raw = mine.reduce((a, o) => a + o.amount, 0n);
    } else {
      voutIdx = tx.vout.findIndex((v) => v.scriptpubkey_address === address);
      if (voutIdx === -1) continue;
      raw = payload.amount;
    }

    const confs =
      tx.status.confirmed && tx.status.block_height
        ? Math.max(0, tipHeight - tx.status.block_height + 1)
        : 0;
    out.push({
      txid: tx.txid,
      vout: voutIdx,
      amount: Number(raw) / 10 ** decimals,
      confirmations: confs,
      blockTime: tx.status.block_time ?? null,
      sendToMany: isMany,
      splitRecipients: isMany
        ? (payload.outputs ?? []).map((o) => ({ address: tx.vout[o.vout]?.scriptpubkey_address ?? null, amount: Number(o.amount) / 10 ** decimals }))
        : undefined,
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
