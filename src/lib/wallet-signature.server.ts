/**
 * TXC wallet signature verification — Worker-safe.
 *
 * TEXITcoin is a Bitcoin-derivative. We verify Bitcoin-style message
 * signatures (BIP-137: magic-prefix + recoverable ECDSA, base64) using
 * @noble/secp256k1 + @noble/hashes + bs58check. These pure-JS modules run
 * natively on Cloudflare workerd; bitcoinjs-message silently fails there
 * (its internal try/catch swallows the error and returns false), which is
 * why this file no longer depends on it.
 *
 * SPEC:
 *   - Magic prefix: "\x18TEXITcoin Signed Message:\n" (the leading \x18 is
 *     the varint length byte of the prefix string, per Bitcoin convention).
 *     We also accept the prefix without the leading length byte for
 *     historical wallet builds and recompute the varint ourselves.
 *   - Address: P2PKH base58check (legacy). SegWit support is TBD.
 *   - Message format: the raw nonce string (the wallet signs exactly the
 *     bytes we hand it).
 */

import * as secp from "@noble/secp256k1";
import { sha256 } from "@noble/hashes/sha2";
import { ripemd160 } from "@noble/hashes/legacy";
import { hmac } from "@noble/hashes/hmac";
import bs58check from "bs58check";

// Wire the synchronous hash hooks @noble/secp256k1 v3 needs for recovery.
// Safe to assign repeatedly; the module is a singleton.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(secp.hashes as any).hmacSha256 = (key: Uint8Array, msg: Uint8Array) => hmac(sha256, key, msg);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(secp.hashes as any).sha256 = (msg: Uint8Array) => sha256(msg);

export { buildSignableMessage } from "@/lib/wallet-auth-shared";

// Accept both historical prefix conventions.
// - "\x18TEXITcoin Signed Message:\n" already begins with the varint length
//   byte (0x18 = 24, the length of "TEXITcoin Signed Message:\n").
// - "TEXITcoin Signed Message:\n" omits the length byte; we prepend the
//   varint ourselves.
const TXC_PREFIX_TEXT = "TEXITcoin Signed Message:\n";
const TXC_PREFIX_VARIANTS: Uint8Array[] = [
  // Variant A: prefix bytes already include the leading varint length byte.
  utf8(`\x18${TXC_PREFIX_TEXT}`),
  // Variant B: prepend our own varint length byte.
  concat(varintBytes(utf8(TXC_PREFIX_TEXT).length), utf8(TXC_PREFIX_TEXT)),
];

export function verifyTxcSignature(opts: {
  address: string;
  message: string;
  signature: string;
}): boolean {
  let sigBytes: Uint8Array;
  try {
    sigBytes = base64Decode(opts.signature);
  } catch {
    return false;
  }
  if (sigBytes.length !== 65) return false;

  const header = sigBytes[0];
  if (header < 27 || header > 42) return false;
  const flag = header - 27;
  // Matches bitcoinjs-message decodeSignature():
  //   compressed: !!(flag & 12)
  //   segwitType: bit 3 (& 8) selects segwit; bit 2 picks P2WPKH vs P2SH-P2WPKH
  //   recovery:   flag & 3
  const compressed = (flag & 12) !== 0;
  const isSegwit = (flag & 8) !== 0;
  const isP2WPKH = isSegwit && (flag & 4) !== 0;
  const isP2SHP2WPKH = isSegwit && (flag & 4) === 0;
  const recId = flag & 3;
  const compact = sigBytes.subarray(1); // r||s, 64 bytes

  // recoverPublicKey wants a 65-byte "recovered" buffer: [recId, r(32), s(32)].
  const recovered = new Uint8Array(65);
  recovered[0] = recId;
  recovered.set(compact, 1);

  // Decode the expected P2PKH hash160 from the base58check address.
  // (SegWit / bech32 addresses are not yet supported — the wallet uses P2PKH.)
  let expectedHash160: Uint8Array;
  try {
    const decoded = bs58check.decode(opts.address);
    if (decoded.length !== 21) return false; // 1-byte version + 20-byte hash
    expectedHash160 = decoded.slice(1);
  } catch {
    return false;
  }

  for (const prefixBytes of TXC_PREFIX_VARIANTS) {
    try {
      const msgHash = magicHash(opts.message, prefixBytes);
      const pubCompressed = secp.recoverPublicKey(recovered, msgHash, {
        prehash: false,
      });
      const point = secp.Point.fromBytes(pubCompressed);
      const pubBytes = point.toBytes(compressed ? "compressed" : "uncompressed");

      // P2PKH only for now: hash160 the pubkey and compare.
      // (If a segwit-tagged signature arrives, the recovered pubkey will
      // still hash160 to the P2PKH address only if that's what the wallet
      // really signed against; otherwise we correctly reject.)
      void isSegwit;
      void isP2WPKH;
      void isP2SHP2WPKH;

      const got = hash160(pubBytes);
      if (constantTimeEqual(got, expectedHash160)) return true;
    } catch {
      // Try the next prefix variant.
    }
  }

  return false;
}

/**
 * Basic TXC address sanity check. Real validation happens via signature
 * verification (a bad address won't recover to the signature).
 */
export function looksLikeTxcAddress(addr: string): boolean {
  if (typeof addr !== "string") return false;
  if (addr.length < 26 || addr.length > 64) return false;
  // base58 + bech32 character set
  return /^[a-zA-Z0-9]+$/.test(addr);
}

// ─── helpers ───────────────────────────────────────────────────────────────

function utf8(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

function varintBytes(n: number): Uint8Array {
  if (n < 0) throw new Error("negative varint");
  if (n < 0xfd) return new Uint8Array([n]);
  if (n <= 0xffff) {
    const a = new Uint8Array(3);
    a[0] = 0xfd;
    a[1] = n & 0xff;
    a[2] = (n >> 8) & 0xff;
    return a;
  }
  if (n <= 0xffffffff) {
    const a = new Uint8Array(5);
    a[0] = 0xfe;
    new DataView(a.buffer).setUint32(1, n, true);
    return a;
  }
  throw new Error("varint too large");
}

function dsha256(b: Uint8Array): Uint8Array {
  return sha256(sha256(b));
}

function hash160(b: Uint8Array): Uint8Array {
  return ripemd160(sha256(b));
}

function magicHash(message: string, prefixBytes: Uint8Array): Uint8Array {
  const mb = utf8(message);
  const buf = concat(prefixBytes, varintBytes(mb.length), mb);
  return dsha256(buf);
}

function base64Decode(s: string): Uint8Array {
  // atob is available in workerd and modern Node; use it for portability.
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}
