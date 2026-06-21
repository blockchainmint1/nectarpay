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

function firstHeaderValue(value: string | null): string | null {
  return value?.split(",")[0]?.trim().replace(/^"|"$/g, "") || null;
}

function forwardedHost(headers: Headers): string | null {
  const forwarded = firstHeaderValue(headers.get("forwarded"));
  const match = forwarded?.match(/(?:^|;)\s*host=([^;]+)/i);
  return match?.[1]?.trim().replace(/^"|"$/g, "") || null;
}

function hostnameFromHost(host: string): string {
  try {
    return new URL(`https://${host}`).hostname;
  } catch {
    return host.split(":")[0] || host;
  }
}

function isLocalHostname(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "0.0.0.0";
}

export function publicOriginFromRequest(request: Request): string {
  const url = new URL(request.url);
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      const parsed = new URL(origin);
      if (!isLocalHostname(parsed.hostname)) return parsed.origin;
    } catch {
      // Ignore malformed origin headers and fall through.
    }
  }

  const referer = request.headers.get("referer");
  if (referer) {
    try {
      const parsed = new URL(referer);
      if (!isLocalHostname(parsed.hostname)) return parsed.origin;
    } catch {
      // Ignore malformed referer headers and fall through.
    }
  }

  const host =
    forwardedHost(request.headers) ??
    firstHeaderValue(request.headers.get("x-forwarded-host")) ??
    firstHeaderValue(request.headers.get("host"));
  if (host) {
    const hostname = hostnameFromHost(host);
    if (!isLocalHostname(hostname)) {
      const proto = firstHeaderValue(request.headers.get("x-forwarded-proto")) ?? "https";
      return `${proto}://${host}`;
    }
  }

  return url.origin;
}

export function authDomainFromRequest(request: Request): string {
  const url = new URL(request.url);
  const queryDomain = url.searchParams.get("domain");
  if (queryDomain && !isLocalHostname(queryDomain)) return queryDomain;

  const host =
    forwardedHost(request.headers) ??
    firstHeaderValue(request.headers.get("x-forwarded-host")) ??
    firstHeaderValue(request.headers.get("host")) ??
    url.host;

  return hostnameFromHost(host);
}

export function buildDeepLink(opts: {
  challengeId: string;
  nonce: string;
  origin: string;
  message: string;
}): string {
  const originUrl = new URL(opts.origin);
  const cbUrl = new URL("/api/public/auth/wallet-callback", originUrl);
  cbUrl.searchParams.set("domain", originUrl.hostname);
  const params = new URLSearchParams({
    id: opts.challengeId,
    nonce: opts.nonce,
    cb: cbUrl.toString(),
  });
  return `${WALLET_DEEP_LINK_SCHEME}://login?${params.toString()}`;
}
