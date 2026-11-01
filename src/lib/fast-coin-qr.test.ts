import { describe, expect, it } from "vitest";
import { parseFastCoinQr } from "./fast-coin-qr";

const address = "TdQdbixtqGqKL1S1MxPrZ7pXDyesTQCTck";
describe("Fast Start coin QR", () => {
  it("fills the six-character asset ID and full public key from the public address", () => {
    expect(parseFastCoinQr(address)).toEqual({ coinId: "dQdbix", publicKey: address });
  });
  it("preserves case in a sticker code for verified lookup", () => {
    expect(parseFastCoinQr("https://app.nectar-pay.com/s/dQdbix")).toEqual({ coinId: "dQdbix", publicKey: null });
    expect(parseFastCoinQr("dqdbix")?.coinId).toBe("dqdbix");
  });
  it("reads a TEXITcoin payment URI without using its amount", () => {
    expect(parseFastCoinQr(`texitcoin:${address}?amount=5`)).toEqual({ coinId: "dQdbix", publicKey: address });
  });
  it("rejects private keys and unrelated QR links", () => {
    expect(parseFastCoinQr("L1aW4aubDFB7yfras2S1mMEYciUkqgcZf7p5jkkXy14e4J5x9a8k")).toBeNull();
    expect(parseFastCoinQr("https://example.com/s/dQdbix")).toBeNull();
    expect(parseFastCoinQr("12345")).toBeNull();
  });
});