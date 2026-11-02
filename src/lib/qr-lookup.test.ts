import { describe, expect, it } from "vitest";
import { buildPaymentUri } from "./payment-uri";
import { invoiceHintFromQr } from "./qr-lookup";

const ID = "8f3c1a2b-1111-4222-8333-944455556666";

describe("smart payment codes", () => {
  it("adds the sale hint to TEXITcoin codes", () => {
    const uri = buildPaymentUri("txc", "TdQdbixtqGqKL1S1MxPrZ7pXDyesTQCTck", 2.55, "TSD", { label: "Kira Gray", invoiceId: ID });
    expect(uri.startsWith("texitcoin:TdQdbixtqGqKL1S1MxPrZ7pXDyesTQCTck?amount=2.55")).toBe(true);
    expect(invoiceHintFromQr(uri)).toBe(ID);
  });
  it("leaves MetaMask-style codes untouched", () => {
    const a = buildPaymentUri("base", "0x1111111111111111111111111111111111111111", 1, "USDC", { invoiceId: ID });
    const b = buildPaymentUri("base", "0x1111111111111111111111111111111111111111", 1, "USDC");
    expect(a).toBe(b);
  });
  it("ignores a malformed hint", () => {
    expect(invoiceHintFromQr("texitcoin:Tabc?inv=evil")).toBeNull();
  });
});
