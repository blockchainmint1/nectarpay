import { describe, expect, it } from "vitest";
import {
  applyTail,
  isSharedEvmInvoice,
  pickFreeTail,
  pickSharedInvoice,
  tailOf,
} from "./evm-shared-address";

const ETH_USD = 2116.93;

describe("single-address EVM amounts", () => {
  it("uses the wallet's main address #0", () => {
    expect(isSharedEvmInvoice({ address_index: 0 })).toBe(true);
    expect(isSharedEvmInvoice({ address_index: 1 })).toBe(false);
    expect(isSharedEvmInvoice({ address_index: null })).toBe(false);
  });

  it("adds less than one cent to a stablecoin sale", () => {
    const amt = applyTail(25, 37, true);
    expect(amt).toBe(25.00037);
    expect(amt - 25).toBeLessThan(0.01);
    expect(tailOf(amt, true)).toBe(37);
  });

  it("never asks more than a cent extra for a $2 ETH sale", () => {
    const base = 2 / ETH_USD;
    const amt = applyTail(base, 999, false);
    expect(amt).toBeGreaterThanOrEqual(base);
    expect((amt - base) * ETH_USD).toBeLessThan(0.01);
    expect(tailOf(amt, false)).toBe(999);
  });

  it("never reuses a tail that is already open", () => {
    const used = new Set(Array.from({ length: 998 }, (_, i) => i + 1)); // 1..998 taken
    expect(pickFreeTail(used)).toBe(999);
    used.add(999);
    expect(pickFreeTail(used)).toBe(-1);
  });
});

describe("matching a payment on the shared address", () => {
  const open = [
    { id: "A", crypto_amount: 25.00037, usdPerUnit: 1 },
    { id: "B", crypto_amount: 25.00412, usdPerUnit: 1 },
  ];

  it("credits the sale whose tail matches exactly", () => {
    expect(pickSharedInvoice(open, 25.00412, true)).toBe("B");
    expect(pickSharedInvoice(open, 25.00037, true)).toBe("A");
  });

  it("does not guess when a rounded payment fits two sales", () => {
    expect(pickSharedInvoice(open, 25.0, true)).toBeNull();
  });

  it("credits a rounded payment when only one sale is within a cent", () => {
    const one = [open[0], { id: "C", crypto_amount: 80.00211, usdPerUnit: 1 }];
    expect(pickSharedInvoice(one, 25.0, true)).toBe("A");
  });

  it("ignores payments more than a cent away from every sale", () => {
    expect(pickSharedInvoice([open[0]], 24.98, true)).toBeNull();
    expect(pickSharedInvoice([open[0]], 500, true)).toBeNull();
  });

  it("matches native ETH by its locked price", () => {
    const sale = { id: "E", crypto_amount: applyTail(2 / ETH_USD, 5, false), usdPerUnit: ETH_USD };
    expect(pickSharedInvoice([sale], Number(sale.crypto_amount), false)).toBe("E");
    // Wallet trimmed the tail: still within a cent → the lone sale.
    expect(pickSharedInvoice([sale], Number((2 / ETH_USD).toFixed(6)), false)).toBe("E");
    // Off by about 5 cents → parked.
    expect(pickSharedInvoice([sale], Number(sale.crypto_amount) + 0.05 / ETH_USD, false)).toBeNull();
  });
});
