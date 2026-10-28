import { expect, test } from "vitest";
import { egivingDecision } from "./egiving";

const on = { egiving_enabled: true, egiving_discount_pct: 10 };
const base = { store: on, tokenSymbol: "TSD", sendToMany: true, invoiceUsd: 5 };

test("$4.50 split to an opted-in store on a $5 invoice is paid in full with a $0.50 discount", () => {
  expect(egivingDecision({ ...base, creditUsd: 4.5 })).toEqual({ amountDueUsd: 4.5, program: "egiving", discountUsd: 0.5, discountPct: 10 });
});
test("merchant share under 90% is not accepted", () => {
  expect(egivingDecision({ ...base, creditUsd: 4.49 }).program).toBeNull();
  expect(egivingDecision({ ...base, creditUsd: 4.49 }).amountDueUsd).toBe(5);
});
test("opted-out store gets no discount", () => {
  expect(egivingDecision({ ...base, store: { egiving_enabled: false }, creditUsd: 4.5 }).program).toBeNull();
});
test("only TSD qualifies", () => {
  expect(egivingDecision({ ...base, tokenSymbol: "USDC", creditUsd: 4.5 }).program).toBeNull();
});
test("simple sends never get the discount", () => {
  expect(egivingDecision({ ...base, sendToMany: false, creditUsd: 4.5 }).program).toBeNull();
});
test("a merchant-set 5% discount needs 95%", () => {
  const s = { ...base, store: { egiving_enabled: true, egiving_discount_pct: 5 } };
  expect(egivingDecision({ ...s, creditUsd: 4.5 }).program).toBeNull();
  expect(egivingDecision({ ...s, creditUsd: 4.75 }).discountUsd).toBe(0.25);
});
