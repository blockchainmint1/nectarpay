import { describe, expect, it } from "vitest";
import { planExpiry } from "./expiry-final-check";

describe("final payment check before a sale expires", () => {
  it("checks an Ethereum sale on the blockchain before expiring it", () => {
    const plan = planExpiry([{ id: "eth-sale", chain: "eth", address: "0xabc" }]);
    expect(plan.check).toEqual(["eth-sale"]);
    expect(plan.expire).toEqual([]);
  });

  it("checks a Base sale on the blockchain before expiring it", () => {
    expect(planExpiry([{ id: "base-sale", chain: "base", address: "0xabc" }]).check).toEqual(["base-sale"]);
  });

  it("expires a TEXITcoin sale straight away", () => {
    const plan = planExpiry([{ id: "txc-sale", chain: "txc", address: "T1" }]);
    expect(plan.expire).toEqual(["txc-sale"]);
    expect(plan.check).toEqual([]);
  });

  it("holds Ethereum sales past the per-run limit instead of expiring them unchecked", () => {
    const due = Array.from({ length: 10 }, (_, i) => ({ id: `s${i}`, chain: "eth", address: "0xabc" }));
    const plan = planExpiry(due, 8);
    expect(plan.check).toHaveLength(8);
    expect(plan.hold).toEqual(["s8", "s9"]);
    expect(plan.expire).toEqual([]);
  });
});
