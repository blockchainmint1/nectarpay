/** Shared constants — safe for both client and server bundles. */

export const WALLET_DEEP_LINK_SCHEME = "payhme";
export const WALLET_CHALLENGE_TTL_SECONDS = 300; // 5 minutes
export const WALLET_POLL_INTERVAL_MS = 2000;

export function buildDeepLink(opts: {
  challengeId: string;
  nonce: string;
  origin: string;
}): string {
  const cb = `${opts.origin}/api/public/auth/wallet-callback`;
  const params = new URLSearchParams({
    id: opts.challengeId,
    nonce: opts.nonce,
    cb,
  });
  return `${WALLET_DEEP_LINK_SCHEME}://login?${params.toString()}`;
}
