/** Shared constants and pure helpers — safe for both client and server bundles. */

export const WALLET_DEEP_LINK_SCHEME = "payhme";
export const WALLET_CHALLENGE_TTL_SECONDS = 300; // 5 minutes
export const WALLET_POLL_INTERVAL_MS = 2000;

/**
 * Human-readable, SIWE-flavored message the wallet displays and signs verbatim.
 * Kept in shared (not *.server) so the challenge endpoint can build it for the
 * deep link and the verifier can reconstruct the exact same bytes.
 */
export function buildSignableMessage(opts: {
  nonce: string;
  domain: string;
  issuedAt: string;
}): string {
  return [
    `${opts.domain} wants you to sign in with your TXC wallet.`,
    ``,
    `Nonce: ${opts.nonce}`,
    `Issued At: ${opts.issuedAt}`,
    `By signing, you authorize a sign-in session for payHME.`,
    `This signature does not authorize any payment.`,
  ].join("\n");
}

/** base64url (no padding) — works in both browser and worker runtimes. */
export function base64UrlEncode(input: string): string {
  // btoa expects latin1; encodeURIComponent → %XX → unescape gives utf-8 bytes
  const b64 =
    typeof btoa === "function"
      ? btoa(unescape(encodeURIComponent(input)))
      : // Node/worker fallback
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (globalThis as any).Buffer.from(input, "utf8").toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function buildDeepLink(opts: {
  challengeId: string;
  nonce: string;
  origin: string;
  message: string;
}): string {
  const cb = `${opts.origin}/api/public/auth/wallet-callback`;
  const params = new URLSearchParams({
    id: opts.challengeId,
    nonce: opts.nonce,
    cb,
    msg: base64UrlEncode(opts.message),
  });
  return `${WALLET_DEEP_LINK_SCHEME}://login?${params.toString()}`;
}
