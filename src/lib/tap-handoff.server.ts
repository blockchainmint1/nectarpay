// NFC tap-to-pay handoff helper.
//
// When a terminal creates an invoice it also mints a short-lived single-use
// nonce. The terminal writes an NDEF tag (or pushes via HCE) containing:
//
//   hme://pay?inv=<invoice_id>&t=<nonce>           (Android intent / deep link)
//   https://nectar-pay.com/pay/<invoice_id>?t=<nonce>   (iOS universal-link fallback)
//
// The customer taps their phone → HME Mobile wallet opens and calls
//   GET  /api/public/v1/pay/:invoiceId?t=<nonce>            (read)
//   POST /api/public/v1/pay/:invoiceId/select?t=<nonce>     (pick chain/token)
//
// Nonce is consumed on first /select. Window is 10 minutes.

import { randomBytes } from "crypto";

export const TAP_NONCE_TTL_MS = 10 * 60 * 1000;

const PUBLIC_ORIGIN =
  process.env.PUBLIC_ORIGIN || "https://nectar-pay.com";
const APP_SCHEME = "hme"; // HME Mobile wallet URI scheme

export interface TapHandoff {
  nonce: string;
  expires_at: string;
  /** Custom-scheme deep link (Android intent filter). */
  tap_url: string;
  /** HTTPS universal link (iOS associated-domain fallback). */
  tap_universal_url: string;
}

/**
 * Mint a new tap-handoff nonce bound to an invoice. Safe to call multiple
 * times — each call returns a fresh nonce (prior ones remain valid until
 * their TTL expires or one is consumed).
 */
export async function issueTapHandoff(
  invoiceId: string,
  originOverride?: string,
): Promise<TapHandoff> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const nonce = randomBytes(18).toString("base64url"); // 24 chars, URL-safe
  const expiresAt = new Date(Date.now() + TAP_NONCE_TTL_MS).toISOString();

  const { error } = await supabaseAdmin
    .from("invoice_tap_nonces")
    .insert({ invoice_id: invoiceId, nonce, expires_at: expiresAt });
  if (error) throw new Error(`Could not issue tap handoff: ${error.message}`);

  const origin = originOverride || PUBLIC_ORIGIN;
  const tap_universal_url = `${origin}/pay/${invoiceId}?t=${nonce}`;
  const tap_url = `${APP_SCHEME}://pay?inv=${invoiceId}&t=${nonce}`;
  return { nonce, expires_at: expiresAt, tap_url, tap_universal_url };
}

/**
 * Validate that `nonce` is live, not consumed, and bound to `invoiceId`.
 * Returns the nonce row id when valid; otherwise an error reason.
 *
 * `consume=true` atomically marks the nonce as consumed (use on /select).
 */
export async function verifyTapHandoff(
  invoiceId: string,
  nonce: string,
  opts: { consume?: boolean } = {},
): Promise<
  | { ok: true; nonceId: string }
  | { ok: false; status: number; error: string }
> {
  if (!nonce || nonce.length < 16 || nonce.length > 64) {
    return { ok: false, status: 401, error: "Missing or malformed handoff token." };
  }
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: row } = await supabaseAdmin
    .from("invoice_tap_nonces")
    .select("id, invoice_id, expires_at, consumed_at")
    .eq("nonce", nonce)
    .maybeSingle();

  if (!row) return { ok: false, status: 401, error: "Unknown handoff token." };
  if (row.invoice_id !== invoiceId) {
    return { ok: false, status: 401, error: "Handoff token does not match invoice." };
  }
  if (row.consumed_at) {
    return { ok: false, status: 410, error: "Handoff token already used." };
  }
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return { ok: false, status: 410, error: "Handoff token expired." };
  }

  if (opts.consume) {
    // Atomic single-use: only succeed if consumed_at is still NULL.
    const { data: updated, error: upErr } = await supabaseAdmin
      .from("invoice_tap_nonces")
      .update({ consumed_at: new Date().toISOString() })
      .eq("id", row.id)
      .is("consumed_at", null)
      .select("id")
      .maybeSingle();
    if (upErr || !updated) {
      return { ok: false, status: 410, error: "Handoff token already used." };
    }
  }
  return { ok: true, nonceId: row.id };
}
