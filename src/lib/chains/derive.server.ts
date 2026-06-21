// HD derivation from merchant xpubs. Pure JS — Worker-safe.
//
// BTC/TXC: @scure/bip32 + @noble/hashes for sha256/ripemd160 → P2PKH (base58check)
//          or P2WPKH (bech32). No native deps.
// EVM:    ethers v6 HDNodeWallet.fromExtendedKey.

import { HDKey } from "@scure/bip32";
import { base58check, bech32 } from "@scure/base";
import { sha256 } from "@noble/hashes/sha256";
import { ripemd160 } from "@noble/hashes/ripemd160";
import { HDNodeWallet } from "ethers";
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

/** Validate that a string is a plausible xpub for the given chain. */
export function isXpubLike(s: string): boolean {
  return /^([xtuvyz]pub)[1-9A-HJ-NP-Za-km-z]{100,120}$/.test(s.trim());
}
