/** Shared constants and pure helpers — safe for both client and server bundles. */

export const WALLET_DEEP_LINK_SCHEME = "payhme";
export const WALLET_CHALLENGE_TTL_SECONDS = 300; // 5 minutes
export const WALLET_POLL_INTERVAL_MS = 2000;
const WALLET_AUTH_PUBLIC_ORIGIN = "https://app.nectar-pay.com";

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

export function publicOriginFromRequest(request: Request): string {
  // Only explicitly owned deployments may receive a wallet callback.
  const allowed = new Set([
    WALLET_AUTH_PUBLIC_ORIGIN,
    "https://nectarpay-app.lovable.app",
    "https://id-preview--faa7c23e-4f75-4eed-8c8c-23234e4242f7.lovable.app",
    "https://project--faa7c23e-4f75-4eed-8c8c-23234e4242f7.lovable.app",
  ]);
  for (const candidate of [request.url, request.headers.get("origin")]) {
    if (!candidate) continue;
    try {
      const origin = new URL(candidate).origin;
      if (allowed.has(origin)) return origin;
    } catch { /* Malformed/untrusted context never changes the destination. */ }
  }
  return WALLET_AUTH_PUBLIC_ORIGIN;
}

export function authDomainFromRequest(_request: Request): string {
  return "app.nectar-pay.com";
}

export function buildDeepLink(opts: {
  challengeId: string;
  nonce: string;
  origin: string;
  message: string;
}): string {
  const originUrl = new URL(opts.origin);
  const cbUrl = buildWalletCallbackUrl({
    challengeId: opts.challengeId,
    origin: opts.origin,
  });
  
  const params = new URLSearchParams({
    id: opts.challengeId,
    nonce: opts.nonce,
    cb: cbUrl,
    msg: base64UrlEncode(opts.message),
    from: originUrl.hostname,
  });
  return `${WALLET_DEEP_LINK_SCHEME}://login?${params.toString()}`;
}

export function buildWalletCallbackUrl(opts: {
  challengeId: string;
  origin: string;
}): string {
  const originUrl = new URL(opts.origin);
  const cbUrl = new URL("/api/public/auth/wallet-callback", originUrl);
  cbUrl.searchParams.set("id", opts.challengeId);
  cbUrl.searchParams.set("domain", originUrl.hostname);
  return cbUrl.toString();
}

export function buildWalletLoginEnvelope(opts: {
  challengeId: string;
  nonce: string;
  origin: string;
  expiresAt: string;
}): string {
  const originUrl = new URL(opts.origin);
  return JSON.stringify({
    v: 1,
    type: "hm-login",
    origin: originUrl.hostname,
    nonce: opts.nonce,
    callback: buildWalletCallbackUrl({
      challengeId: opts.challengeId,
      origin: opts.origin,
    }),
    statement: "This signature does not authorize any payment.",
    expiresAt: new Date(opts.expiresAt).getTime(),
    chain: "txc",
  });
}
