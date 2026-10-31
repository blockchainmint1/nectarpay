/**
 * Cold Storage Coin IDs are the 6 characters after the leading "T" of the coin's
 * TEXITcoin address. They are mixed-case (base58), so case matters — never upper-case them.
 * The same ID is the merchant's sticker code.
 */
export function normalizeCoinId(raw: string): string | null {
  const v = raw.trim().replace(/\s+/g, "");
  return /^[0-9A-Za-z]{6}$/.test(v) ? v : null;
}

/** TEXITcoin P2PKH addresses start with T and are base58. */
export function isTxcAddress(a: string): boolean {
  return /^T[1-9A-HJ-NP-Za-km-z]{25,34}$/.test(a);
}

/** The coin ID printed on a sticker must match the address it claims. */
export function coinIdMatchesAddress(coinId: string, address: string): boolean {
  return address.slice(1, 7) === coinId;
}

export function stickerPath(code: string): string {
  const normalized = normalizeCoinId(code);
  if (!normalized) throw new Error("Invalid sticker code");
  return `/s/${normalized}`;
}

/** Static coin payments must be new, exact credits; never guess a partial sale. */
export function stickerCreditEligible(input: {
  txid: string; excluded: string[]; amount: number; expected: number;
  blockTimeMs: number | null; createdAt: string;
}): boolean {
  if (input.excluded.includes(input.txid)) return false;
  if (!Number.isFinite(input.amount) || Math.abs(input.amount - input.expected) > 0.00000001) return false;
  if (input.blockTimeMs != null && input.blockTimeMs < Date.parse(input.createdAt)) return false;
  return true;
}

/* ------------------------------------------------------------------ */
/* Public-form abuse controls                                           */
/* ------------------------------------------------------------------ */

/** At most this many enrollments from one address... */
export const ENROLL_IP_MAX = 5;
/** ...inside this many minutes. */
export const ENROLL_IP_WINDOW_MIN = 30;

/** True while an address that already made `recentCount` submissions may make one more. */
export function ipWithinLimit(recentCount: number, max: number = ENROLL_IP_MAX): boolean {
  return recentCount < max;
}

/** The visitor's address. Proxies append to x-forwarded-for, so the first hop is the client. */
export function clientIpFromHeaders(get: (name: string) => string | null): string | null {
  const xff = get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const alt = get("cf-connecting-ip") ?? get("x-real-ip");
  return alt?.trim() || null;
}

/**
 * Bot trap: a hidden field people never see, so only a script ever fills it in.
 * The name is deliberately meaningless — a browser that autofills a field called
 * "company_url" would silently discard a real merchant's enrollment.
 */
export const HONEYPOT_FIELD = "hp_x9";

export function honeypotFilled(value: string | undefined | null): boolean {
  return typeof value === "string" && value.trim() !== "";
}

/* ------------------------------------------------------------------ */
/* Optional business website                                            */
/* ------------------------------------------------------------------ */

export const WEBSITE_MAX = 200;

export type WebsiteResult = { ok: true; value: string | null } | { ok: false; message: string };

/**
 * Merchants type `example.com` or paste a full link; either way we store one
 * shape — `https://example.com/some/page` — so it is safe to click and can never
 * carry a `javascript:` payload into the store profile.
 */
export function normalizeWebsite(raw: string | null | undefined): WebsiteResult {
  const input = (raw ?? "").trim();
  if (!input) return { ok: true, value: null };
  if (input.length > WEBSITE_MAX) return { ok: false, message: "That website address is too long." };
  if (/\s/.test(input)) return { ok: false, message: "A website address can't contain spaces." };
  const candidate = /^https?:\/\//i.test(input) ? input : `https://${input}`;
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return { ok: false, message: "That doesn't look like a website address." };
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return { ok: false, message: "That doesn't look like a website address." };
  if (url.username || url.password) return { ok: false, message: "That doesn't look like a website address." };
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(url.hostname)) {
    return { ok: false, message: "Websites look like example.com — please check the spelling." };
  }
  const path = url.pathname === "/" ? "" : url.pathname.replace(/\/+$/, "");
  return { ok: true, value: `https://${url.hostname}${url.port ? `:${url.port}` : ""}${path}` };
}

/* ------------------------------------------------------------------ */
/* Auto go-live: what the admin queue still has to watch                */
/* ------------------------------------------------------------------ */

/**
 * A submission goes live on its own the moment the coin checks out, so a row is
 * only finished when it is activated AND linked to a store. Anything else is a
 * setup that failed and needs one retry.
 */
export function storeIsLive(row: { status: string; store_id: string | null }): boolean {
  return row.status === "activated" && !!row.store_id;
}

/**
 * The welcome kit is what tells a merchant their sticker works. A live store
 * whose email never went out — including one that failed — is still owed it.
 */
export function welcomeEmailOutstanding(row: {
  status: string;
  store_id: string | null;
  welcome_sent_at: string | null;
}): boolean {
  return storeIsLive(row) && !row.welcome_sent_at;
}
