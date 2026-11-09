import { describe, expect, it } from "vitest";
import { KEY_COOL_OFF_HOURS, currentKey, keyChangeNeedsEmailCode, normalizeChainKey } from "./chain-key-input";

const XPUB = "xpub6C36Wxho" + "a".repeat(99);

describe("hand-pasted wallet keys", () => {
  it("waits 4 hours before a replacement key takes payments", () => {
    expect(KEY_COOL_OFF_HOURS).toBe(4);
  });

  it("admins always need the emailed code", () => {
    expect(keyChangeNeedsEmailCode({ actingAsAdmin: true, storeHasAnyKey: false })).toBe(true);
    expect(keyChangeNeedsEmailCode({ actingAsAdmin: true, storeHasAnyKey: true })).toBe(true);
  });

  it("owners need the code unless it's the first key on a brand-new store", () => {
    expect(keyChangeNeedsEmailCode({ actingAsAdmin: false, storeHasAnyKey: true })).toBe(true);
    expect(keyChangeNeedsEmailCode({ actingAsAdmin: false, storeHasAnyKey: false })).toBe(false);
  });

  it("stores xpubs and addresses in the right columns", () => {
    expect(normalizeChainKey("eth", XPUB)).toEqual({ ok: true, xpub: XPUB, xpub_or_address: XPUB });
    expect(normalizeChainKey("tron", "T" + "A".repeat(33))).toEqual({ ok: true, xpub: null, xpub_or_address: "T" + "A".repeat(33) });
    expect(normalizeChainKey("lightning", "")).toEqual({ ok: true, xpub: null, xpub_or_address: "" });
  });

  it("refuses junk, blanks and coins that can't be set by hand", () => {
    expect(normalizeChainKey("eth", "0xabc").ok).toBe(false);
    expect(normalizeChainKey("btc", "").ok).toBe(false);
    expect(normalizeChainKey("zcu", XPUB).ok).toBe(false);
    expect(normalizeChainKey("lightning", "javascript:alert(1)").ok).toBe(false);
  });

  it("reads the key a row pays to", () => {
    expect(currentKey({ xpub: null, xpub_or_address: "" })).toBeNull();
    expect(currentKey({ xpub: XPUB, xpub_or_address: XPUB })).toBe(XPUB);
    expect(currentKey({ xpub: null, xpub_or_address: "bc1qxyz" })).toBe("bc1qxyz");
  });
});
