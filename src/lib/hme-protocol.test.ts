import { expect, test } from "vitest";
import { createHmac } from "node:crypto";
import { hmeEventBody, verifyHmeTicket } from "./hme-protocol";

const fakeKey = "FAKE_TEST_KEY_NOT_A_CREDENTIAL";
const now = 1800000000000;
const ticket = { iss: "honest.money", site: "nectarpay", minerId: "11111111-1111-4111-8111-111111111111", email: "member@example.com", nonce: "test-nonce", exp: now / 1000 + 120 };
function sign(data: unknown) {
  const body = Buffer.from(JSON.stringify(data)).toString("base64url");
  return `${body}.${createHmac("sha256", fakeKey).update(body).digest("hex")}`;
}
test("accepts a NectarPay ticket signed over its encoded body", async () => {
  await expect(verifyHmeTicket(sign(ticket), fakeKey, now)).resolves.toMatchObject({ site: "nectarpay" });
});
test("rejects tickets for a different site", async () => {
  await expect(verifyHmeTicket(sign({ ...ticket, site: "other" }), fakeKey, now)).rejects.toThrow();
});
test("rejects tickets from a different issuer", async () => {
  await expect(verifyHmeTicket(sign({ ...ticket, iss: "other" }), fakeKey, now)).rejects.toThrow();
});
test("requires the permanent member UUID", async () => {
  await expect(verifyHmeTicket(sign({ ...ticket, minerId: undefined }), fakeKey, now)).rejects.toThrow();
});
test("rejects expired tickets", async () => {
  await expect(verifyHmeTicket(sign({ ...ticket, exp: now / 1000 - 1 }), fakeKey, now)).rejects.toThrow();
});
test("rejects a validity period longer than 120 seconds", async () => {
  await expect(verifyHmeTicket(sign({ ...ticket, exp: now / 1000 + 121 }), fakeKey, now)).rejects.toThrow();
});
test("rejects altered signatures", async () => {
  await expect(verifyHmeTicket(sign(ticket), "OTHER_FAKE_TEST_KEY", now)).rejects.toThrow();
});
test("signup reports carry nectarpay and the referral", () => {
  expect(hmeEventBody("new@example.com", "sponsor")).toEqual({ service: "nectarpay", event: "signup", email: "new@example.com", ref: "sponsor" });
});
test("known members report permanent identity instead of email", () => {
  expect(hmeEventBody("new@example.com", null, ticket.minerId)).toEqual({ service: "nectarpay", event: "signup", member_id: ticket.minerId });
});