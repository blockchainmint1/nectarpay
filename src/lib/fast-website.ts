import { z } from "zod";
import { normalizeWebsite } from "./fast-enroll";

export function fastWebsiteUrl(raw: string): string {
  const site = normalizeWebsite(raw);
  if (!site.ok || !site.value) throw new Error(site.ok ? "Enter a website first." : site.message);
  const url = new URL(site.value);
  // Only public DNS names go to the external scraper; never fetch user URLs locally.
  if (url.port || /^(?:\d+\.)+\d+$/.test(url.hostname) || /(?:^|\.)(?:localhost|local|internal|test|invalid)$/.test(url.hostname)) {
    throw new Error("Use the business's public website address.");
  }
  return site.value;
}

const text = (max: number) => z.string().trim().max(max).nullable().optional();
export const websiteDetailsSchema = z.object({
  businessName: text(120), category: text(80), email: z.string().trim().email().max(255).nullable().optional(),
  phone: text(40), street: text(200), city: text(120), region: text(120), postalCode: text(20), description: text(1000),
});
export type WebsiteDetails = z.infer<typeof websiteDetailsSchema>;

/** Suggestions fill blank fields only, including fields edited while the lookup was running. */
export function mergeWebsiteDetails<T extends Record<string, string>>(form: T, details: WebsiteDetails): T {
  const next = { ...form };
  for (const key of Object.keys(details)) {
    const value = details[key as keyof WebsiteDetails];
    if (key in next && !next[key]?.trim() && value) next[key as keyof T] = value as T[keyof T];
  }
  return next;
}
/** Website lookups spend scraping credits, so the public /fast page is capped. */
export const WEBSITE_LOOKUP_LIMITS = {
  perVisitor: 10,
  perVisitorWindowSec: 10 * 60,
  site: 200,
  siteWindowSec: 60 * 60,
} as const;

/** `mine`/`everyone` are counts including this request. */
export function websiteLookupAllowed(mine: number, everyone: number): boolean {
  return mine <= WEBSITE_LOOKUP_LIMITS.perVisitor && everyone <= WEBSITE_LOOKUP_LIMITS.site;
}
