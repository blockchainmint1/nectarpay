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

/** Derive an address at `m/<receiveBranch>/<index>` from an xpub for a BTC-like chain. */
export function deriveBtcLikeAddress(
  xpub: string,
  network: BtcLikeNetwork,
  index: number,
): string {
  const root = HDKey.fromExtendedKey(xpub);
  const child = root.deriveChild(network.receiveBranch).deriveChild(index);
  if (!child.publicKey) throw new Error("Failed to derive public key");
  const h160 = hash160(child.publicKey);

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
