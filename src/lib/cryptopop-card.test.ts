import { expect, test } from "vitest";
import { createHmac } from "crypto";
import { CARD_APPROVAL_TIMEOUT_MS, CardRequest, cardInvoiceError, normalizeCardReply } from "./cryptopop-card";
import { cardHeaders, issueCardPollToken, validCardPollToken } from "./cryptopop-card.server";

const key = "FAKE_TEST_ONLY_KEY";
const now = 1800000000000;
const payment = "11111111-1111-4111-8111-111111111111";
test("signs exact POST body and Unix-second timestamp", () => {
  const body = '{"card_uid":"AABBCCDD", "invoice_id":"invoice"}';
  const headers = cardHeaders(key, body, now);
  expect(headers["x-hme-timestamp"]).toBe("1800000000");
  expect(headers["x-hme-signature"]).toBe(createHmac("sha256", key).update(`1800000000.${body}`).digest("hex"));
  expect(headers["x-hme-signature"]).not.toBe(cardHeaders(key, body.replace(", ", ","), now)["x-hme-signature"]);
});
test("signs status reads over payment ID, not JSON", () => {
  expect(cardHeaders(key, payment, now)["x-hme-signature"]).toBe(createHmac("sha256", key).update(`1800000000.${payment}`).digest("hex"));
});
test("binds polling to the same invoice, terminal and provider payment", () => {
  const token = issueCardPollToken(key, "invoice", "terminal", payment, now);
  expect(validCardPollToken(key, token, "invoice", "terminal", payment, now)).toBe(true);
  expect(validCardPollToken(key, token, "other", "terminal", payment, now)).toBe(false);
  expect(validCardPollToken(key, token, "invoice", "other", payment, now)).toBe(false);
  expect(validCardPollToken(key, token, "invoice", "terminal", "other", now)).toBe(false);
  expect(validCardPollToken(key, token, "invoice", "terminal", payment, now + CARD_APPROVAL_TIMEOUT_MS + 60000)).toBe(false);
});
test("requires 4–8 digit PINs and scoped approval polling", () => {
  expect(CardRequest.safeParse({ card_uid: "AABBCCDD", pin: "1234" }).success).toBe(true);
  expect(CardRequest.safeParse({ card_uid: "AABBCCDD", pin: "12345678" }).success).toBe(true);
  for (const pin of ["123", "123456789", "abcd"]) expect(CardRequest.safeParse({ card_uid: "AABBCCDD", pin }).success).toBe(false);
  expect(CardRequest.safeParse({ payment_id: payment }).success).toBe(false);
});
const invoice = { status: "pending", fiat_currency: "USD", expires_at: new Date(now + 60000).toISOString() };
test("requires USD invoices", () => {
  expect(cardInvoiceError(invoice, true, now)).toBeNull();
  expect(cardInvoiceError({ ...invoice, fiat_currency: "EUR" }, true, now)).toBe("Card payments need a USD sale.");
});
test("requires enabled TSD", () => expect(cardInvoiceError(invoice, false, now)).toBe("This store doesn't accept TSD."));
test("rejects closed or expired sales", () => {
  expect(cardInvoiceError({ ...invoice, status: "paid" }, true, now)).toBe("This sale is no longer open.");
  expect(cardInvoiceError(invoice, true, now + 60000)).toBe("This sale has expired.");
});
test("accepts sent only with a transaction reference; never reports it as confirmed", () => {
  expect(normalizeCardReply({ status: "sent", txid: "a".repeat(64) }, true).status).toBe("sent");
  expect(normalizeCardReply({ status: "sent" }, true).status).toBe("failed");
  expect(normalizeCardReply({ status: "paid" }, true).status).toBe("failed");
});
test("preserves wrong-PIN and decline reasons and approval IDs", () => {
  expect(normalizeCardReply({ status: "pin_required", reason: "Wrong PIN" }, true).reason).toBe("Wrong PIN");
  expect(normalizeCardReply({ status: "declined", reason: "Card is turned off" }, true).reason).toBe("Card is turned off");
  expect(normalizeCardReply({ status: "approval_required", payment_id: payment }, true).payment_id).toBe(payment);
});