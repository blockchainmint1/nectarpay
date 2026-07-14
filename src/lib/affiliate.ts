// Client-side affiliate (mineTXC) capture + read.
// First-touch attribution: never overwrite an existing cookie.
// URL param: ?r=<affiliateId>. Cookie: nectar_ref (90 days).

const COOKIE = "nectar_ref";
const LANDING = "nectar_ref_landing";
const FIRST_SEEN = "nectar_ref_first_seen";
const UTM_KEY = "nectar_ref_utm";
const REFERRER_KEY = "nectar_ref_referrer";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 90; // 90 days
// Allow letters, numbers, dash, underscore. Cap length to avoid abuse.
const AFFILIATE_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

function setCookie(name: string, value: string, maxAgeSeconds: number) {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie =
    `${name}=${encodeURIComponent(value)}; Max-Age=${maxAgeSeconds}` +
    `; Path=/; SameSite=Lax${secure}`;
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split("=").slice(1).join("=")) : null;
}

export type AffiliateSnapshot = {
  affiliate_id: string;
  landing_path: string | null;
  first_seen_at: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  referrer: string | null;
};

/**
 * Capture ?r=<id> from the current URL if present.
 * First-touch: if we already have a cookie, do nothing.
 * Safe to call on every route change.
 */
export function captureAffiliateFromUrl() {
  if (typeof window === "undefined") return;
  try {
    const url = new URL(window.location.href);
    const ref = url.searchParams.get("r");
    if (!ref || !AFFILIATE_ID_RE.test(ref)) return;

    // First-touch — bail if we already recorded one.
    if (readCookie(COOKIE) || localStorage.getItem(COOKIE)) return;

    const now = new Date().toISOString();
    const utm = {
      source: url.searchParams.get("utm_source"),
      medium: url.searchParams.get("utm_medium"),
      campaign: url.searchParams.get("utm_campaign"),
    };

    setCookie(COOKIE, ref, MAX_AGE_SECONDS);
    localStorage.setItem(COOKIE, ref);
    localStorage.setItem(LANDING, url.pathname + url.search);
    localStorage.setItem(FIRST_SEEN, now);
    localStorage.setItem(UTM_KEY, JSON.stringify(utm));
    if (document.referrer) localStorage.setItem(REFERRER_KEY, document.referrer);

    // Fire-and-forget click count bump for general-program codes. Safe
    // for mineTXC ids too — the RPC is a no-op when the code isn't found.
    void import("@/integrations/supabase/client").then(({ supabase }) => {
      supabase.rpc("increment_affiliate_click", { _code: ref }).then(() => {}, () => {});
    });
  } catch {
    /* ignore */
  }
}


export function readAffiliateSnapshot(): AffiliateSnapshot | null {
  if (typeof window === "undefined") return null;
  const id = readCookie(COOKIE) || localStorage.getItem(COOKIE);
  if (!id || !AFFILIATE_ID_RE.test(id)) return null;
  let utm: { source?: string; medium?: string; campaign?: string } = {};
  try {
    utm = JSON.parse(localStorage.getItem(UTM_KEY) || "{}");
  } catch { /* ignore */ }
  return {
    affiliate_id: id,
    landing_path: localStorage.getItem(LANDING),
    first_seen_at: localStorage.getItem(FIRST_SEEN),
    utm_source: utm.source ?? null,
    utm_medium: utm.medium ?? null,
    utm_campaign: utm.campaign ?? null,
    referrer: localStorage.getItem(REFERRER_KEY),
  };
}

export function clearAffiliateSnapshot() {
  if (typeof window === "undefined") return;
  setCookie(COOKIE, "", 0);
  [COOKIE, LANDING, FIRST_SEEN, UTM_KEY, REFERRER_KEY].forEach((k) =>
    localStorage.removeItem(k),
  );
}
