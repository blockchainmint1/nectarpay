import { describe, expect, it } from "vitest";
import { fastConsentSchema, fastConsentRecord } from "./fast-consent";
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