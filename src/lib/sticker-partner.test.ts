import { describe, expect, it } from "vitest";
import { createHmac } from "crypto";
import { StickerLookup, StickerPayment, StickerPaid, verifyStickerSignature, stickerResponseSignature } from "./sticker-partner";

const secret = "unit-test-only-key";
const ts = "1793525940";
const now = Number(ts) * 1000;
const request_id = "dc48a500-9a25-43de-a3c5-5e5d38360114";
const raw = JSON.stringify({ code: "dQdbix", request_id });
const signature = createHmac("sha256", secret).update(`${ts}.${raw}`).digest("hex");

describe("trusted sticker requests", () => {
  it("accepts a bound payment hint but never a supplied paid status", () => {
    const hint = { code: "dQdbix", request_id, invoice_id: request_id, txid: "9573726df81ddb1c120c9737a477ecd48ccb73ef73ea850caa156abd7d639861" };
    expect(StickerPaid.parse(hint).txid).toBe(hint.txid);
    expect(StickerPaid.safeParse({ ...hint, status: "confirmed" }).success).toBe(false);
    expect(StickerPaid.safeParse({ ...hint, txid: "not-a-transaction" }).success).toBe(false);
  });
  it("preserves the exact mixed-case coin code", () => {
    expect(StickerLookup.parse({ code: "dQdbix", request_id }).code).toBe("dQdbix");
  });
  it("accepts exact-body signatures but refuses changed codes", () => {
    expect(verifyStickerSignature(secret, raw, ts, signature, now)).toBe(true);
    expect(verifyStickerSignature(secret, raw.replace("dQdbix", "dqdbix"), ts, signature, now)).toBe(false);
  });
  it("refuses old timestamps and missing signatures", () => {
    expect(verifyStickerSignature(secret, raw, ts, signature, now + 301_000)).toBe(false);
    expect(verifyStickerSignature(secret, raw, ts, "", now)).toBe(false);
  });
  it("binds signed wallet destinations to their original request", () => {
    const response = JSON.stringify({ address: "merchant-address" });
    const signed = stickerResponseSignature(secret, raw, response, ts);
    expect(stickerResponseSignature(secret, raw.replace(request_id, "different-request"), response, ts)).not.toBe(signed);
    expect(stickerResponseSignature(secret, raw, response.replace("merchant-address", "wrong-address"), ts)).not.toBe(signed);
  });
  it("allows a $2.50 sale with whole cents", () => {
    expect(StickerPayment.parse({ code: "dQdbix", request_id, amount: 2.5 }).amount).toBe(2.5);
    expect(StickerPayment.safeParse({ code: "dQdbix", request_id, amount: 2.501 }).success).toBe(false);
  });
  it("keeps the existing $0.50 minimum", () => {
    expect(StickerPayment.safeParse({ code: "dQdbix", request_id, amount: 0.5 }).success).toBe(true);
    expect(StickerPayment.safeParse({ code: "dQdbix", request_id, amount: 0.49 }).success).toBe(false);
  });
  it("keeps the existing $250 maximum", () => {
    expect(StickerPayment.safeParse({ code: "dQdbix", request_id, amount: 250 }).success).toBe(true);
    expect(StickerPayment.safeParse({ code: "dQdbix", request_id, amount: 250.01 }).success).toBe(false);
  });
});