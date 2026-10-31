import { describe, it, expect } from "vitest";
import {
  coinIdMatchesAddress,
  ENROLL_IP_MAX,
  ENROLL_IP_WINDOW_MIN,
  clientIpFromHeaders,
  honeypotFilled,
  ipWithinLimit,
  normalizeCoinId,
  normalizeWebsite,
  stickerPath,
  stickerCreditEligible,
} from "./fast-enroll";

describe("fast enrollment coin IDs", () => {
  it("keeps case and requires exactly 6 characters", () => {
    expect(normalizeCoinId(" oaRhmG ")).toBe("oaRhmG");
    expect(normalizeCoinId("12345")).toBeNull();
  });
  it("sticker code must be the 6 characters after the leading T", () => {
    expect(coinIdMatchesAddress("oaRhmG", "ToaRhmGqAW7PyvPJvbLJo69mnZwhaaA1vu")).toBe(true);
    expect(coinIdMatchesAddress("OARHMG", "ToaRhmGqAW7PyvPJvbLJo69mnZwhaaA1vu")).toBe(false);
  });
});

describe("merchant stickers", () => {
  it("uses the exact merchant coin code in the sticker URL", () => {
    expect(stickerPath("dQdbix")).toBe("/s/dQdbix");
    expect(stickerPath("dqdbix")).not.toBe(stickerPath("dQdbix"));
  });
  const credit = { txid: "new", excluded: ["old"], amount: 5, expected: 5, blockTimeMs: null, createdAt: "2026-10-31T15:22:00Z" };
  it("does not reuse a payment already present when checkout started", () => {
    expect(stickerCreditEligible({ ...credit, txid: "old" })).toBe(false);
    expect(stickerCreditEligible(credit)).toBe(true);
  });
  it("does not guess a sale from a different amount", () => {
    expect(stickerCreditEligible({ ...credit, amount: 4.99 })).toBe(false);
  });
  it("rejects a confirmed payment from before checkout", () => {
    expect(stickerCreditEligible({ ...credit, blockTimeMs: Date.parse("2026-10-31T15:21:59Z") })).toBe(false);
  });
});

describe("public enrollment abuse controls", () => {
  it("reads the visitor's address off the first x-forwarded-for hop", () => {
    const headers: Record<string, string> = {
      "x-forwarded-for": "203.0.113.7, 10.0.0.1, 198.51.100.9",
      "cf-connecting-ip": "192.0.2.44",
    };
    expect(clientIpFromHeaders((n) => headers[n] ?? null)).toBe("203.0.113.7");
  });
  it("falls back to the connecting address, and to nothing when no header is present", () => {
    expect(clientIpFromHeaders((n) => (n === "cf-connecting-ip" ? " 192.0.2.44 " : null))).toBe("192.0.2.44");
    expect(clientIpFromHeaders(() => null)).toBeNull();
    expect(clientIpFromHeaders(() => "")).toBeNull();
  });
  it("allows the cap and rejects one more", () => {
    expect(ipWithinLimit(ENROLL_IP_MAX - 1)).toBe(true);
    expect(ipWithinLimit(ENROLL_IP_MAX)).toBe(false);
    expect(ipWithinLimit(99)).toBe(false);
    expect(ipWithinLimit(0, 1)).toBe(true);
  });
  it("keeps the throttle window at 30 minutes", () => {
    expect(ENROLL_IP_WINDOW_MIN).toBe(30);
  });
  it("only trips the bot trap when the hidden field holds something", () => {
    expect(honeypotFilled("")).toBe(false);
    expect(honeypotFilled("   ")).toBe(false);
    expect(honeypotFilled(undefined)).toBe(false);
    expect(honeypotFilled("http://spam.example")).toBe(true);
  });
});

describe("merchant website on the enrollment form", () => {
  it("leaves the field empty when the merchant skips it", () => {
    expect(normalizeWebsite("")).toEqual({ ok: true, value: null });
    expect(normalizeWebsite("   ")).toEqual({ ok: true, value: null });
    expect(normalizeWebsite(undefined)).toEqual({ ok: true, value: null });
  });
  it("accepts a bare domain and stores one https shape", () => {
    expect(normalizeWebsite("example.com")).toEqual({ ok: true, value: "https://example.com" });
    expect(normalizeWebsite("  http://Example.com/Shop/  ")).toEqual({ ok: true, value: "https://example.com/Shop" });
    expect(normalizeWebsite("shop.example.co.uk/menu")).toEqual({ ok: true, value: "https://shop.example.co.uk/menu" });
    expect(normalizeWebsite("https://example.com:8080/x")).toEqual({ ok: true, value: "https://example.com:8080/x" });
  });
  it("refuses anything that is not a real web address", () => {
    expect(normalizeWebsite("my shop").ok).toBe(false);
    expect(normalizeWebsite("localhost").ok).toBe(false);
    expect(normalizeWebsite("javascript:alert(1)").ok).toBe(false);
    expect(normalizeWebsite("https://user:pass@example.com").ok).toBe(false);
    expect(normalizeWebsite("x".repeat(201)).ok).toBe(false);
  });
});
