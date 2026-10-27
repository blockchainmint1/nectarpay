import { afterEach, expect, test, vi } from "vitest";
import { captureAffiliateFromUrl, readAffiliateSnapshot } from "./affiliate";

afterEach(() => vi.unstubAllGlobals());
test("Honest Money uses a 30-day last-click referral while local first touch stays unchanged", () => {
  const cookies = new Map<string, string>([["nectar_ref", "first"]]);
  const writes: string[] = [];
  const storage = new Map<string, string>([["nectar_ref", "first"]]);
  vi.stubGlobal("window", { location: { href: "https://app.nectar-pay.com/auth?ref=LATEST", protocol: "https:" } });
  vi.stubGlobal("localStorage", { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) });
  vi.stubGlobal("document", {
    get cookie() { return [...cookies].map(([k,v]) => `${k}=${v}`).join("; "); },
    set cookie(value: string) { writes.push(value); const [k,v] = value.split(";")[0].split("="); cookies.set(k, v); },
  });
  captureAffiliateFromUrl();
  expect(readAffiliateSnapshot()?.affiliate_id).toBe("latest");
  expect(cookies.get("nectar_ref")).toBe("first");
  expect(writes[0]).toContain("Max-Age=2592000");
});