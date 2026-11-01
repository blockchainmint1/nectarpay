import { describe, expect, it } from "vitest";
import { fastConsentSchema, fastConsentRecord } from "./fast-consent";
import { readFileSync } from "node:fs";
const valid = { nonCustodial: true, basicSetup: true, directoryOptIn: true, signature: "data:image/png;base64,iVBORw0KGgo=" };
describe("Fast Start enrollment consent", () => {
  it("requires explicit non-custodial acknowledgement", () => {
    expect(fastConsentSchema.safeParse(valid).success).toBe(true);
    expect(fastConsentSchema.safeParse({ ...valid, nonCustodial: false }).success).toBe(false);
  });
  it("requires explicit basic setup and instant acceptance acknowledgement", () => {
    expect(fastConsentSchema.safeParse({ ...valid, basicSetup: false }).success).toBe(false);
  });
  it("requires a raster signature, not blank or SVG", () => {
    expect(fastConsentSchema.safeParse({ ...valid, signature: "" }).success).toBe(false);
    expect(fastConsentSchema.safeParse({ ...valid, signature: "data:image/svg+xml;base64,PHN2Zz4=" }).success).toBe(false);
  });
  it("records both directory choices independently of required consent", () => {
    expect(fastConsentRecord(true).directoryOptIn).toBe(true);
    expect(fastConsentRecord(false).directoryOptIn).toBe(false);
    expect(fastConsentSchema.safeParse({ ...valid, directoryOptIn: false }).success).toBe(true);
  });
});
describe("Fast Start activation defaults", () => {
  const sql = readFileSync(new URL("../../drizzle/migrations/0033_fast_start_consent_listing.sql", import.meta.url), "utf8");
  it("enables TXC with only TSD", () => {
    expect(sql).toMatch(/VALUES \(sid,'txc',f\.tsd_address,NULL,true,ARRAY\['TSD'\]\)/);
  });
  it("enables slow-chain and TSD instant acceptance with the existing 250 cap", () => {
    const columns = sql.match(/INSERT INTO stores\(([^)]+)\)/)?.[1].split(",");
    expect(columns?.slice(-3)).toEqual(["mempool_accept_slow", "tsd_instant", "tsd_instant_max_usd"]);
    expect(sql).toMatch(/END,true,true,250\) RETURNING/);
  });
  it("publishes only opted-in directory listings", () => {
    expect(sql).toMatch(/CASE WHEN f\.directory_opt_in THEN 'full' ELSE 'hidden' END/);
  });
});