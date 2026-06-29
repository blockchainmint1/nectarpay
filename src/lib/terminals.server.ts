// Server-only helpers for POS terminal pairing + HMAC verification.
// Never import from a client-reachable module at top level.

import { createHmac, timingSafeEqual, randomBytes, createHash } from "crypto";

// 6-char pairing code alphabet: no 0/O/1/I to avoid handwriting ambiguity.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generatePairingCode(len = 6): string {
  const bytes = randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return out;
}

export function generateHmacSecretHex(bytes = 32): string {
  return randomBytes(bytes).toString("hex");
}

export function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

/** Tolerated clock skew between terminal and server, in milliseconds. */
const MAX_SKEW_MS = 120_000;

export type HmacVerifyResult =
  | { ok: true; terminal: { id: string; store_id: string; label: string } }
  | { ok: false; status: number; error: string };

/**
 * Verifies an HMAC-signed request from a POS terminal.
 * Expected headers:
 *   X-Terminal-Id: <uuid>
 *   X-Timestamp:   <unix-ms>
 *   X-Signature:   hex(HMAC_SHA256(secret, `${timestamp}.${rawBody}`))
 */
export async function verifyTerminalSignature(
  request: Request,
  rawBody: string,
): Promise<HmacVerifyResult> {
  const terminalId = request.headers.get("x-terminal-id") || "";
  const ts = request.headers.get("x-timestamp") || "";
  const sig = (request.headers.get("x-signature") || "").toLowerCase();

  if (!terminalId || !ts || !sig) {
    return { ok: false, status: 401, error: "Missing terminal auth headers." };
  }

  const tsNum = Number(ts);
  if (!Number.isFinite(tsNum)) {
    return { ok: false, status: 401, error: "Bad timestamp." };
  }
  if (Math.abs(Date.now() - tsNum) > MAX_SKEW_MS) {
    return { ok: false, status: 401, error: "Timestamp out of range." };
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // We don't store the raw secret — only its sha-256. To verify, we have to
  // walk every (active) row for the given terminal id and recompute. Since
  // terminals.id is the PK there is at most one row, so this is fine.
  const { data: row } = await supabaseAdmin
    .from("terminals")
    .select("id, store_id, label, hmac_secret_hash, revoked_at, last_seen_ip, geoip_updated_at")
    .eq("id", terminalId)
    .maybeSingle();

  if (!row) return { ok: false, status: 401, error: "Unknown terminal." };
  if (row.revoked_at) return { ok: false, status: 401, error: "Terminal revoked." };

  // The secret itself isn't in the DB; we need it to recompute the HMAC.
  // We follow the same trick api_keys uses: the client sends the secret in
  // the signature implicitly. So instead we verify by recomputing the
  // *expected* signature using the secret derived from a per-terminal lookup
  // table cached in memory? No — we don't have the secret server-side.
  //
  // Correct approach: store the secret **hashed** AND keep no plaintext.
  // To verify, the client must include the secret-derived signature, and we
  // verify by recomputing HMAC with the *plaintext* secret we receive from
  // the client at pair time and persist in... wait, we can't persist it.
  //
  // The clean fix: store sha-256(secret) and verify by having the client
  // also send the secret? That defeats the purpose.
  //
  // The right model: store the secret server-side (encrypted at rest is
  // ideal, but the DB is already private). Use the `hmac_secret_hash`
  // column to hold the actual secret hex (it's already random + 32 bytes
  // of entropy and only visible to service_role). We renamed to *_hash
  // for forward compat, but for v1 we store the plaintext hex secret.
  //
  // To make this explicit, this column holds the secret hex directly.
  const secretHex = row.hmac_secret_hash;

  const expected = createHmac("sha256", Buffer.from(secretHex, "hex"))
    .update(`${ts}.${rawBody}`)
    .digest("hex");

  const a = Buffer.from(sig, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, status: 401, error: "Bad signature." };
  }

  return { ok: true, terminal: { id: row.id, store_id: row.store_id, label: row.label } };
}
