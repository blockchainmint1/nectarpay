// Customer signatures. The terminal's "Sign below" pad produces a small PNG
// data URL; every signature is kept as a real image file in the private
// sale-signatures bucket, and the inline data-URL copy on the sale record is
// only a fallback for the rare sale whose file upload failed.
//
// This module is browser- and Worker-safe: no Supabase, no Node APIs.

/** Same cap the terminal receipt endpoint has always enforced. */
export const MAX_SIGNATURE_CHARS = 200_000;

/** Private bucket holding one image per signed sale. */
export const SIGNATURE_BUCKET = "sale-signatures";

/** Content-ID used for the signature image inside the customer receipt email. */
export const SIGNATURE_CID = "sale-signature";

interface SignatureKind {
  ext: string;
  magic: number[];
}

/** Only these formats are accepted, verified by their file header bytes. */
const SIGNATURE_KINDS: Record<string, SignatureKind> = {
  "image/png": { ext: "png", magic: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  "image/jpeg": { ext: "jpg", magic: [0xff, 0xd8, 0xff] },
};

export interface ParsedSignature {
  /** Base64 payload without the `data:` prefix. */
  base64: string;
  mime: string;
  bytes: Uint8Array;
}

const B64_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/** Strict base64 decoder: returns null instead of throwing on bad input. */
export function bytesFromBase64(input: string): Uint8Array | null {
  const clean = input.replace(/\s/g, "").replace(/=+$/, "");
  if (clean.length === 0) return null;
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let written = 0;
  let buffer = 0;
  let bits = 0;
  for (let i = 0; i < clean.length; i += 1) {
    const value = B64_ALPHABET.indexOf(clean[i]);
    if (value < 0) return null;
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[written] = (buffer >> bits) & 0xff;
      written += 1;
    }
  }
  return out.subarray(0, written);
}

/** Base64 encoder that needs no browser or Node globals. */
export function base64FromBytes(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];
    out += B64_ALPHABET[b0 >> 2];
    out += B64_ALPHABET[((b0 & 0x03) << 4) | ((b1 ?? 0) >> 4)];
    out += b1 === undefined ? "" : B64_ALPHABET[((b1 & 0x0f) << 2) | ((b2 ?? 0) >> 6)];
    out += b2 === undefined ? "" : B64_ALPHABET[b2 & 0x3f];
  }
  while (out.length % 4 !== 0) out += "=";
  return out;
}

function hasMagic(bytes: Uint8Array, magic: number[]): boolean {
  return magic.every((byte, index) => bytes[index] === byte);
}

/**
 * Accepts only a data URL whose declared format matches its real header bytes.
 * Anything else (HTML, SVG, oversized, truncated) returns null so callers can
 * refuse it — the file is later shown in a browser and in an email.
 */
export function parseSignatureDataUrl(raw: string): ParsedSignature | null {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > MAX_SIGNATURE_CHARS) return null;
  const match = /^data:(image\/[a-z]+);base64,([\s\S]+)$/.exec(raw.trim());
  if (!match) return null;
  const [, mime, base64] = match;
  const kind = SIGNATURE_KINDS[mime];
  if (!kind) return null;
  const bytes = bytesFromBase64(base64);
  if (!bytes || bytes.length === 0) return null;
  if (!hasMagic(bytes, kind.magic)) return null;
  return { base64, mime, bytes };
}

/** One image file per sale: `<invoice id>.png`. */
export function signatureObjectPath(invoiceId: string, mime = "image/png"): string {
  const ext = SIGNATURE_KINDS[mime]?.ext ?? "png";
  return `${invoiceId}.${ext}`;
}

/** File name shown to the customer for the emailed/printed signature. */
export function signatureFileName(invoiceId: string, mime = "image/png"): string {
  return `signature-${invoiceId.slice(0, 8)}.${SIGNATURE_KINDS[mime]?.ext ?? "png"}`;
}

/** A row as stored on the sale record, narrowed to what the signature needs. */
export interface SignatureRow {
  id: string;
  signature_path?: string | null;
  signature_data_url?: string | null;
}

/** True when a sale has a signature in either form. */
export function hasStoredSignature(row: SignatureRow): boolean {
  return Boolean(row.signature_path || row.signature_data_url);
}
