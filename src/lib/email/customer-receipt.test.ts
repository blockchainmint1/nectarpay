import { describe, expect, it } from "vitest";
import { receiptBreakdown, receiptEligible } from "./customer-receipt";
import { sesEmailBody } from "./ses.server";

describe("customer receipt rules", () => {
  it("only sends a completed-sale receipt", () => {
    expect(receiptEligible("pending")).toBe(false);
    expect(receiptEligible("underpaid")).toBe(false);
    expect(receiptEligible("confirmed")).toBe(true);
    expect(receiptEligible("overpaid")).toBe(true);
  });
  it("uses the recorded tax and tip, not current store settings", () => {
    expect(receiptBreakdown("POS subtotal:10000 tax:825 tip:1500", 123.25)).toEqual({ subtotal: 100, tax: 8.25, tip: 15 });
    expect(receiptBreakdown("POS subtotal:10000 tax:825 tip:1500", 120)).toBeNull();
    expect(receiptBreakdown(null, 100)).toBeNull();
  });
  it("sends one recipient through the verified root sender", () => {
    const result = sesEmailBody({ to: "buyer@example.com", subject: "Receipt", html: "<p>Paid</p>", text: "Paid" });
    expect(result.Destination.ToAddresses).toEqual(["buyer@example.com"]);
    expect(result.FromEmailAddress).toBe("NectarPay <noreply@nectar-pay.com>");
  });
});