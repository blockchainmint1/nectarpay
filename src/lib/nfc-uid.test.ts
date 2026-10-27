import { describe, expect, it } from "vitest";
import { uidPayload } from "./nfc-uid";

describe("uidPayload", () => {
  it("keeps the case the terminal sent (lowercase hex)", () => {
    expect(uidPayload("04a1b2c3")).toBe("04a1b2c3");
    expect(uidPayload("04A1B2C3")).toBe("04A1B2C3");
  });

  it("does not strip separators that the device produced", () => {
    expect(uidPayload("04:a1:b2:c3")).toBe("04:a1:b2:c3");
  });

  it("trims surrounding whitespace only", () => {
    expect(uidPayload("  04a1b2c3 \n")).toBe("04a1b2c3");
  });

  it("returns null for missing or empty UIDs", () => {
    expect(uidPayload(null)).toBeNull();
    expect(uidPayload(undefined)).toBeNull();
    expect(uidPayload("")).toBeNull();
    expect(uidPayload("   ")).toBeNull();
  });
});
