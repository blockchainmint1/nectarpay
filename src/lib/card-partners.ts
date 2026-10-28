// Pure helpers for routing a card tap to the wallet partner that issued the card.
export type CardPartnerRoute = { id: string; card_domains: string[]; is_default: boolean; active: boolean };

export function cardHost(cardUrl: string | null | undefined): string | null {
  if (!cardUrl) return null;
  try { return new URL(cardUrl).hostname.toLowerCase(); } catch { return null; }
}

/** Card's web-address domain (or a subdomain of it) picks the partner; otherwise the default partner. */
export function pickCardPartner<T extends CardPartnerRoute>(partners: T[], cardUrl: string | null | undefined): T | null {
  const live = partners.filter((p) => p.active);
  const host = cardHost(cardUrl);
  if (host) {
    const hit = live.find((p) => p.card_domains.some((d) => {
      const dom = d.trim().toLowerCase().replace(/^\*?\./, "");
      return dom && (host === dom || host.endsWith(`.${dom}`));
    }));
    if (hit) return hit;
  }
  return live.find((p) => p.is_default) ?? null;
}

export function normalizeDomains(input: string): string[] {
  return [...new Set(input.split(/[\s,]+/).map((d) => d.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "")).filter((d) => /^[a-z0-9.-]+\.[a-z]{2,}$/.test(d)))];
}

/** The card's web address from a tag read, if it has one. */
export function cardUrlFromTag(event: { parsed?: { format: string; uri?: string }; records?: { raw?: string }[] }): string | null {
  const p = event.parsed;
  if (p && (p.format === "url" || p.format === "nectar-uri") && p.uri) return p.uri.slice(0, 512);
  const raw = event.records?.map((r) => r.raw ?? "").find((r) => /^https?:\/\//i.test(r));
  return raw ? raw.slice(0, 512) : null;
}
