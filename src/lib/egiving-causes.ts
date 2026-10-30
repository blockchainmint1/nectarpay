// Signed public list of eGiving causes (approved churches). Pure helpers so
// the signing and filtering can be tested without the Worker runtime.
import bs58check from "bs58check";
import { hashes, getPublicKey, sign } from "@noble/secp256k1";
import { sha256 } from "@noble/hashes/sha256";
import { ripemd160 } from "@noble/hashes/ripemd160";
import { hmac } from "@noble/hashes/hmac";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(hashes as any).sha256 = (m: Uint8Array) => sha256(m);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(hashes as any).hmacSha256 = (k: Uint8Array, m: Uint8Array) => hmac(sha256, k, m);

export const TXC_SIGN_PREFIX = "\x1aTEXITcoin Signed Message:\n";

export type Cause = {
  code: string | null;
  name: string;
  city: string | null;
  blurb: string | null;
  address: string;
  featured: boolean;
};

export function filterCauses(causes: Cause[], opts: { q?: string; code?: string }): Cause[] {
  if (opts.code) {
    const c = opts.code.trim().toUpperCase();
    return causes.filter((x) => x.code === c);
  }
  const q = opts.q?.trim().toLowerCase();
  if (!q) return causes;
  return causes.filter((x) =>
    [x.name, x.city, x.code, x.blurb].some((v) => v?.toLowerCase().includes(q)),
  );
}

function varInt(n: number): Uint8Array {
  if (n < 0xfd) return new Uint8Array([n]);
  const b = new Uint8Array(3);
  b[0] = 0xfd;
  new DataView(b.buffer).setUint16(1, n, true);
  return b;
}

export function txcMessageHash(message: string): Uint8Array {
  const p = new TextEncoder().encode(TXC_SIGN_PREFIX);
  const m = new TextEncoder().encode(message);
  if (m.length > 0xffff) throw new Error("message too long");
  const len = varInt(m.length);
  const buf = new Uint8Array(p.length + len.length + m.length);
  buf.set(p, 0);
  buf.set(len, p.length);
  buf.set(m, p.length + len.length);
  return sha256(sha256(buf));
}

/** Private key is derived from the server secret, so the secret never needs to be key-shaped. */
export function signerKey(secret: string): Uint8Array {
  return sha256(new TextEncoder().encode(`nectarpay-egiving-causes:${secret}`));
}

export function signerAddress(priv: Uint8Array): string {
  const pub = getPublicKey(priv, true);
  const payload = new Uint8Array(21);
  payload[0] = 0x42; // TXC P2PKH
  payload.set(ripemd160(sha256(pub)), 1);
  return bs58check.encode(payload);
}

/** Bitcoin-style compact message signature (base64, compressed P2PKH header). */
export function signTxcMessage(message: string, priv: Uint8Array): string {
  const rec = sign(txcMessageHash(message), priv, { prehash: false, format: "recovered" });
  // noble "recovered" = [recovery, r(32), s(32)]
  const out = new Uint8Array(65);
  out[0] = 31 + rec[0];
  out.set(rec.slice(1), 1);
  let s = "";
  for (const b of out) s += String.fromCharCode(b);
  return btoa(s);
}

export function buildSignedList(causes: Cause[], priv: Uint8Array, issuedAt = new Date().toISOString()) {
  const signed_payload = JSON.stringify({ issued_at: issuedAt, causes });
  return {
    issued_at: issuedAt,
    count: causes.length,
    causes,
    signed_payload,
    signer: signerAddress(priv),
    signature: signTxcMessage(signed_payload, priv),
  };
}
