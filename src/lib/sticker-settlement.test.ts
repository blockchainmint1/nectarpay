import { describe, expect, it, vi, afterEach } from "vitest";
import { stickerPaymentInWindow } from "./sticker-settlement";

const created = "2026-11-01T10:05:08.254Z";
const expires = "2026-11-01T10:20:08.254Z";
afterEach(() => vi.useRealTimers());
describe("sticker payment recovery", () => {
  it("recovers Bobby's 2.55 TSD payment made at 10:05:38 even after bill expiry", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-01T10:30:00Z"));
    expect(stickerPaymentInWindow(created, expires, Date.parse("2026-11-01T10:05:38Z"))).toBe(true);
  });
  it("does not assign a later shopper's payment to an expired bill", () => {
    expect(stickerPaymentInWindow(created, expires, Date.parse("2026-11-01T10:20:09Z"))).toBe(false);
  });
  it("rejects a historical credit", () => {
    expect(stickerPaymentInWindow(created, expires, Date.parse("2026-11-01T10:05:07Z"))).toBe(false);
  });
  it("does not recover an expired invoice from an undated hint", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-01T10:30:00Z"));
    expect(stickerPaymentInWindow(created, expires, null)).toBe(false);
    vi.setSystemTime(new Date("2026-11-01T10:06:00Z"));
    expect(stickerPaymentInWindow(created, expires, null)).toBe(true);
  });
});