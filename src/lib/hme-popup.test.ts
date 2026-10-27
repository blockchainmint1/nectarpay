import { expect, test } from "vitest";
import { hmeTicketMessage, validHmeFlow } from "./hme-popup";

const flow = "a".repeat(32);
test("only accepts a ticket for the initiating popup flow", () => {
  expect(hmeTicketMessage({ type: "hme-sso", flow, token: "test-ticket" }, flow)).toBe(true);
  expect(hmeTicketMessage({ type: "hme-sso", flow: "b".repeat(32), token: "test-ticket" }, flow)).toBe(false);
});
test("rejects missing or non-string popup tickets", () => {
  for (const token of [undefined, "", 123, {}]) {
    expect(hmeTicketMessage({ type: "hme-sso", flow, token }, flow)).toBe(false);
  }
});
test("only accepts randomly scoped callback channel identifiers", () => {
  expect(validHmeFlow(flow)).toBe(true);
  expect(validHmeFlow("shared-channel")).toBe(false);
  expect(validHmeFlow("a".repeat(31))).toBe(false);
});