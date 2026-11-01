import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fastWebsiteUrl, mergeWebsiteDetails } from "./fast-website";
describe("website assisted Fast Start", () => {
  it("accepts a public website and rejects local targets", () => {
    expect(fastWebsiteUrl("example.com")).toBe("https://example.com");
    for (const url of ["127.0.0.1", "10.1.2.3", "host.local", "host.internal", "https://example.com:8080", "https://user:pass@example.com"]) expect(() => fastWebsiteUrl(url)).toThrow();
  });
  it("prefills email, phone, address and description without replacing manual entries", () => {
    expect(mergeWebsiteDetails({ email: "", phone: "my number", street: "", description: "" }, { email: "hello@example.com", phone: "123", street: "123 Main St", description: "Local bakery" })).toEqual({ email: "hello@example.com", phone: "my number", street: "123 Main St", description: "Local bakery" });
  });
  it("carries the merchant's approved description into the starter store", () => {
    const sql = readFileSync(new URL("../../drizzle/migrations/0035_fast_start_business_description.sql", import.meta.url), "utf8");
    expect(sql).toContain("f.website,f.business_description,'USD'");
    expect(sql).toContain("website,business_description,fiat_currency");
  });
});