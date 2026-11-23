import { describe, expect, it } from "vitest";
import { addressReusable, evmAddressColumns, evmAddressMode, pickRecyclableAddress } from "./evm-address-mode";
import { LATE_CHECK_DELAY_MS } from "./expiry-final-check";
import { RECYCLE_AFTER_EXPIRY_MS } from "./evm-address-mode";

describe("the three Ethereum address settings", () => {
  it("rotation off means everything goes to the same main address", () => {
    expect(evmAddressMode(false, true)).toBe("shared");
    expect(evmAddressColumns("shared").evm_address_rotation).toBe(false);
  });
  it("rotate and recycle is rotation on with re-use on", () => {
    expect(evmAddressMode(true, true)).toBe("recycle");
    expect(evmAddressColumns("recycle")).toEqual({ evm_address_rotation: true, evm_address_reuse: true });
  });
  it("rotate and never reuse is rotation on with re-use off", () => {
    expect(evmAddressMode(true, false)).toBe("fresh");
    expect(evmAddressColumns("fresh")).toEqual({ evm_address_rotation: true, evm_address_reuse: false });
  });
});

describe("re-using an address (rotate and recycle)", () => {
  const now = Date.parse("2026-11-23T18:00:00Z");
  const sale = (createdMinAgo: number, expiresMinAgo: number, status = "expired") => ({
    status,
    created_at: new Date(now - createdMinAgo * 60_000).toISOString(),
    expires_at: new Date(now - expiresMinAgo * 60_000).toISOString(),
  });

  it("is refused while a sale on it is still open", () => {
    expect(addressReusable([sale(200, 140, "pending")], now)).toBe(false);
  });
  it("is refused 2 minutes after a 1-hour sale expired (its late hour isn't over)", () => {
    expect(addressReusable([sale(62, 2)], now)).toBe(false);
  });
  it("is allowed once the last sale expired more than 65 minutes ago", () => {
    expect(addressReusable([sale(130, 66, "confirmed")], now)).toBe(true);
  });
  it("waits at least as long as the late-payment check does", () => {
    expect(RECYCLE_AFTER_EXPIRY_MS).toBeGreaterThanOrEqual(LATE_CHECK_DELAY_MS);
  });
});

describe("choosing an address to re-use", () => {
  const now = Date.parse("2026-11-23T18:00:00Z");
  const ago = (min: number) => new Date(now - min * 60_000).toISOString();
  const A = "0x3a319E0fCbc9E8621D021B7243bd520951D7c1D4";
  const B = "0x2222222222222222222222222222222222222222";
  const derivable = new Set([A.toLowerCase(), B.toLowerCase()]);
  const done = (address: string) => ({ address, status: "expired", created_at: ago(300), expires_at: ago(240) });

  it("skips an address with an open sale on another network (Base) when reusing for Ethereum", () => {
    const sales = [done(A), { address: A, status: "pending", created_at: ago(5), expires_at: null }, done(B)];
    const pick = pickRecyclableAddress([{ address: A, address_index: 1 }, { address: B, address_index: 2 }], sales, derivable, now);
    expect(pick?.address).toBe(B);
  });
  it("matches sales to an address whatever its upper/lower case", () => {
    const sales = [{ address: A.toLowerCase(), status: "detected", created_at: ago(400), expires_at: ago(300) }];
    expect(pickRecyclableAddress([{ address: A, address_index: 1 }], sales, derivable, now)).toBeNull();
  });
  it("never re-uses the main address #0", () => {
    expect(pickRecyclableAddress([{ address: A, address_index: 0 }], [done(A)], derivable, now)).toBeNull();
  });
  it("never re-uses an address the current wallet can't produce", () => {
    expect(pickRecyclableAddress([{ address: A, address_index: 1 }], [done(A)], new Set(), now)).toBeNull();
  });
});
