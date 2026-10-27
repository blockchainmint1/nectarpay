// HD derivation from merchant xpubs. Pure JS — Worker-safe.
//
// BTC/TXC: @scure/bip32 + @noble/hashes for sha256/ripemd160 → P2PKH (base58check)
//          or P2WPKH (bech32). No native deps.
// EVM:    ethers v6 HDNodeWallet.fromExtendedKey.

import { HDKey } from "@scure/bip32";
import { base58check, bech32 } from "@scure/base";
import { sha256 } from "@noble/hashes/sha256";
import { ripemd160 } from "@noble/hashes/ripemd160";
import { HDNodeWallet, SigningKey, keccak256, getBytes } from "ethers";
import type { BtcLikeNetwork, EvmNetwork } from "./networks";

const b58check = base58check(sha256);

function hash160(pubkey: Uint8Array): Uint8Array {
  return ripemd160(sha256(pubkey));
}

// Known extended-public-key version bytes → normalized to standard xpub (0x0488B21E).
// @scure/bip32 only accepts the Bitcoin mainnet version bytes, so ypub/zpub/etc.
// must have their 4-byte prefix swapped before parsing. The payload is unchanged.
const XPUB_VERSION_BYTES: Record<string, number> = {
  xpub: 0x0488b21e,
  ypub: 0x049d7cb2,
  zpub: 0x02aa7ed3,
  vpub: 0x045f1cf6,
  upub: 0x044a5262,
  tpub: 0x043587cf,
};
const STANDARD_XPUB_VERSION = 0x0488b21e;

function normalizeToXpub(key: string): string {
  const prefix = key.trim().slice(0, 4);
  const version = XPUB_VERSION_BYTES[prefix];
  if (!version || version === STANDARD_XPUB_VERSION) return key.trim();
  const decoded = b58check.decode(key.trim());
  const out = new Uint8Array(decoded);
  out[0] = (STANDARD_XPUB_VERSION >>> 24) & 0xff;
  out[1] = (STANDARD_XPUB_VERSION >>> 16) & 0xff;
  out[2] = (STANDARD_XPUB_VERSION >>> 8) & 0xff;
  out[3] = STANDARD_XPUB_VERSION & 0xff;
  return b58check.encode(out);
}

/** Derive an address at `m/<receiveBranch>/<index>` from an xpub for a BTC-like chain. */
export function deriveBtcLikeAddress(
  xpub: string,
  network: BtcLikeNetwork,
  index: number,
): string {
  const root = HDKey.fromExtendedKey(normalizeToXpub(xpub));
  const child = root.deriveChild(network.receiveBranch).deriveChild(index);
  if (!child.publicKey) throw new Error("Failed to derive public key");
  const h160 = hash160(child.publicKey);

  if (network.cashAddrPrefix) {
    // Bitcoin Cash: CashAddr (BCH-40 checksum), type 0 = P2PKH.
    return encodeCashAddr(network.cashAddrPrefix, 0, h160);
  }

  if (network.defaultAddressType === "p2wpkh") {
    // bech32 P2WPKH, witness version 0
    const words = bech32.toWords(h160);
    return bech32.encode(network.bech32Hrp, [0, ...words]);
  }
  // P2PKH: version byte || hash160 → base58check
  const payload = new Uint8Array(1 + h160.length);
  payload[0] = network.pubKeyHash;
  payload.set(h160, 1);
  return b58check.encode(payload);
}

/** Derive an EVM address at `m/0/<index>` from an xpub. Works for any EVM chain. */
export function deriveEvmAddress(xpub: string, _network: EvmNetwork, index: number): string {
  // ethers expects the xpub to be the parent; deriveChild walks the path.
  const node = HDNodeWallet.fromExtendedKey(xpub);
  // HDNode.fromExtendedKey returns either an HDNodeWallet or HDNodeVoidWallet.
  // Both expose .derivePath().
  const child = (node as { derivePath: (p: string) => { address: string } }).derivePath(
    `0/${index}`,
  );
  return child.address;
}

/**
 * Derive a Tron address at `m/0/<index>` from an xpub.
 * Tron uses secp256k1 + keccak256(uncompressedPubKey)[12:] (same as EVM),
 * prefixed with 0x41 and encoded as base58check.
 */
export function deriveTronAddress(xpub: string, index: number): string {
  const node = HDNodeWallet.fromExtendedKey(xpub);
  const child = (node as { derivePath: (p: string) => { publicKey: string } }).derivePath(
    `0/${index}`,
  );
  const uncompressed = SigningKey.computePublicKey(child.publicKey, false); // 0x04 || X(32) || Y(32)
  const pubBytes = getBytes(uncompressed).slice(1); // 64 bytes
  const hash = getBytes(keccak256(pubBytes)); // 32 bytes
  const addrBytes = new Uint8Array(21);
  addrBytes[0] = 0x41;
  addrBytes.set(hash.slice(-20), 1);
  return b58check.encode(addrBytes);
}

/** Validate that a string is a plausible xpub for the given chain. */
export function isXpubLike(s: string): boolean {
  return /^([xtuvyz]pub)[1-9A-HJ-NP-Za-km-z]{100,120}$/.test(s.trim());
}

/** Validate a Solana address: base58, 32–44 chars, decodes to 32 bytes. */
export function isSolanaAddressLike(s: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s.trim());
}

/** Validate a Tron address: starts with T, 34 chars, base58. */
export function isTronAddressLike(s: string): boolean {
  return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(s.trim());
}


// ---- CashAddr (Bitcoin Cash) ----
// Spec: https://reference.cash/protocol/blockchain/encoding/cashaddr
const CASHADDR_CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";

function cashAddrPolymod(values: number[]): bigint {
  let c = 1n;
  for (const d of values) {
    const c0 = c >> 35n;
    c = ((c & 0x07ffffffffn) << 5n) ^ BigInt(d);
    if (c0 & 0x01n) c ^= 0x98f2bc8e61n;
    if (c0 & 0x02n) c ^= 0x79b76d99e2n;
    if (c0 & 0x04n) c ^= 0xf33e5fb3c4n;
    if (c0 & 0x08n) c ^= 0xae2eabe2a8n;
    if (c0 & 0x10n) c ^= 0x1e4f43e470n;
  }
  return c ^ 1n;
}

/** Generic base-2^from → base-2^to bit regrouping. */
function convertBits(data: Uint8Array | number[], from: number, to: number, pad: boolean): number[] {
  let acc = 0;
  let bits = 0;
  const out: number[] = [];
  const maxv = (1 << to) - 1;
  for (const value of data) {
    acc = (acc << from) | value;
    bits += from;
    while (bits >= to) {
      bits -= to;
      out.push((acc >> bits) & maxv);
    }
  }
  if (pad && bits > 0) out.push((acc << (to - bits)) & maxv);
  return out;
}

/** Encode a hash160 as a CashAddr string, e.g. "bitcoincash:qq…". */
export function encodeCashAddr(prefix: string, type: number, hash160Bytes: Uint8Array): string {
  // version byte: type << 3 | size bits (0 = 160-bit hash)
  const versionByte = (type << 3) | 0;
  const payload = new Uint8Array(1 + hash160Bytes.length);
  payload[0] = versionByte;
  payload.set(hash160Bytes, 1);

  const payloadWords = convertBits(payload, 8, 5, true);
  const prefixWords = [...prefix].map((c) => c.charCodeAt(0) & 0x1f);
  const checksumInput = [...prefixWords, 0, ...payloadWords, 0, 0, 0, 0, 0, 0, 0, 0];
  const mod = cashAddrPolymod(checksumInput);

  const checksumWords: number[] = [];
  for (let i = 0; i < 8; i++) {
    checksumWords.push(Number((mod >> BigInt(5 * (7 - i))) & 0x1fn));
  }

  const body = [...payloadWords, ...checksumWords].map((w) => CASHADDR_CHARSET[w]).join("");
  return `${prefix}:${body}`;
}
