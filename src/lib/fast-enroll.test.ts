import { describe, it, expect } from "vitest";
import {
  coinIdMatchesAddress,
  ENROLL_IP_MAX,
  ENROLL_IP_WINDOW_MIN,
  clientIpFromHeaders,
  honeypotFilled,
  ipWithinLimit,
  normalizeCoinId,
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
