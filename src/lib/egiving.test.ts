import { expect, test } from "vitest";
import { egivingDecision , EGIVING_PROGRAM_ADDRESS } from "./egiving";

const on = { egiving_enabled: true, egiving_discount_pct: 10 };
const registry = new Map<string, "church" | "program">([["church", "church"], ["program", "program"]]);
const split = (m: number, c = 0.4, p = 0.1, cAddr = "church", pAddr = EGIVING_PROGRAM_ADDRESS) => [
  { address: "merchant", amount: m },
  { address: cAddr, amount: c },
  { address: pAddr, amount: p },
];
const base = { store: on, tokenSymbol: "TSD", sendToMany: true, invoiceUsd: 5, merchantAddress: "merchant", registry };

test("$4.50 / $0.40 / $0.10 to registered givers is paid in full with a $0.50 discount", () => {
  expect(egivingDecision({ ...base, creditUsd: 4.5, recipients: split(4.5) })).toEqual({ amountDueUsd: 4.5, program: "egiving", discountUsd: 0.5, discountPct: 10 });
});
test("merchant share under 90% is not accepted", () => {
  expect(egivingDecision({ ...base, creditUsd: 4.49, recipients: split(4.49, 0.41) }).program).toBeNull();
});
test("the other 10% sent back to the customer earns no discount", () => {
  expect(egivingDecision({ ...base, creditUsd: 4.5, recipients: split(4.5, 0.4, 0.1, "customer") }).program).toBeNull();
});
test("no program output means no discount", () => {
  expect(egivingDecision({ ...base, creditUsd: 4.5, recipients: split(4.5, 0.5, 0, "church", "church") }).program).toBeNull();
});
test("shares that don't add up to the invoice are refused", () => {
  expect(egivingDecision({ ...base, creditUsd: 4.5, recipients: split(4.5, 0.01, 0.01) }).program).toBeNull();
});
test("opted-out store gets no discount", () => {
  expect(egivingDecision({ ...base, store: { egiving_enabled: false }, creditUsd: 4.5, recipients: split(4.5) }).program).toBeNull();
});
test("only TSD qualifies", () => {
  expect(egivingDecision({ ...base, tokenSymbol: "USDC", creditUsd: 4.5, recipients: split(4.5) }).program).toBeNull();
});
test("a stored 5% or 50% discount cannot change the fixed 10% rule", () => {
  for (const pct of [5, 50]) {
    const s = { ...base, store: { egiving_enabled: true, egiving_discount_pct: pct } };
    expect(egivingDecision({ ...s, creditUsd: 4.5, recipients: split(4.5) })).toEqual({
      amountDueUsd: 4.5,
      program: "egiving",
      discountUsd: 0.5,
      discountPct: 10,
    });
  }
});

test("a program row in the list no longer counts; only the NectarGive wallet does", () => {
  expect(egivingDecision({ ...base, creditUsd: 4.5, recipients: split(4.5, 0.4, 0.1, "church", "program") }).program).toBeNull();
});
