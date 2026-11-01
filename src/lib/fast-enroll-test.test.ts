import { describe, it, expect } from "vitest";
import { testPaymentArrived } from "./fast-enroll";
describe("testPaymentArrived", () => {
  it("counts instant-detected and confirmed payments", () => {
    expect(testPaymentArrived("detected")).toBe(true);
    expect(testPaymentArrived("confirmed")).toBe(true);
  });
  it("ignores pending, expired and missing bills", () => {
    expect(testPaymentArrived("pending")).toBe(false);
    expect(testPaymentArrived("expired")).toBe(false);
    expect(testPaymentArrived(null)).toBe(false);
  });
});
