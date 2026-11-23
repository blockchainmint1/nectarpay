import { describe, expect, it } from "vitest";
import { confirmingExpiryCutoff, missedPaymentReason, planExpiry } from "./expiry-final-check";

describe("last look before a sale expires", () => {
  it("checks an Ethereum sale on the blockchain before expiring it", () => {
    const plan = planExpiry([{ id: "eth-sale", chain: "eth", address: "0xabc" }]);
    expect(plan.check).toEqual([{ id: "eth-sale", kind: "evm" }]);
    expect(plan.expire).toEqual([]);
  });

  it("checks a Base sale on the blockchain before expiring it", () => {
    expect(planExpiry([{ id: "base-sale", chain: "base", address: "0xabc" }]).check).toEqual([{ id: "base-sale", kind: "evm" }]);
  });

  it("checks a TEXITcoin / TSD sale on the blockchain before expiring it", () => {
    expect(planExpiry([{ id: "txc-sale", chain: "txc", address: "T1" }]).check).toEqual([{ id: "txc-sale", kind: "utxo" }]);
  });

  it("checks a Bitcoin sale on the blockchain before expiring it", () => {
    expect(planExpiry([{ id: "btc-sale", chain: "btc", address: "bc1q" }]).check).toEqual([{ id: "btc-sale", kind: "utxo" }]);
  });

  it("expires a sale that never got a payment address straight away", () => {
    const plan = planExpiry([{ id: "no-coin", chain: null, address: null }]);
    expect(plan.expire).toEqual(["no-coin"]);
  });

  it("holds sales past the per-run limit instead of expiring them unchecked", () => {
    const due = Array.from({ length: 10 }, (_, i) => ({ id: `s${i}`, chain: "eth", address: "0xabc" }));
    const plan = planExpiry(due, 8);
    expect(plan.check).toHaveLength(8);
    expect(plan.hold).toEqual(["s8", "s9"]);
    expect(plan.expire).toEqual([]);
  });
});

describe("sales whose payment is still confirming", () => {
  it("stay open for 24 hours past their expiry time", () => {
    const now = Date.parse("2026-11-23T18:00:00Z");
    expect(confirmingExpiryCutoff(now).toISOString()).toBe("2026-11-22T18:00:00.000Z");
  });
});

describe("payments nobody took", () => {
  const created = "2026-11-22T16:13:24Z";
  const expires = "2026-11-22T17:13:23Z";

  it("an on-time payment is listed as missed", () => {
    expect(missedPaymentReason(Date.parse("2026-11-22T16:18:11Z"), created, expires)).toBe("missed");
  });

  it("a payment 14 seconds after expiry is listed as late", () => {
    expect(missedPaymentReason(Date.parse("2026-11-22T17:13:37Z"), created, expires)).toBe("after_expiry");
  });

  it("a payment 59 minutes after expiry is still listed as late", () => {
    expect(missedPaymentReason(Date.parse("2026-11-22T18:12:23Z"), created, expires)).toBe("after_expiry");
  });

  it("a payment more than an hour after expiry is not tied to the sale", () => {
    expect(missedPaymentReason(Date.parse("2026-11-22T18:14:00Z"), created, expires)).toBeNull();
  });

  it("a payment from before the sale opened is not tied to it", () => {
    expect(missedPaymentReason(Date.parse("2026-11-22T16:00:00Z"), created, expires)).toBeNull();
  });
});
