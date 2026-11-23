import { describe, expect, it } from "vitest";
import { addressReusable, evmAddressColumns, evmAddressMode } from "./evm-address-mode";
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
