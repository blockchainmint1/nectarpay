import { describe, expect, it } from "vitest";
import { zonedParts, zonedTimeToUtc, safeTimeZone } from "./timezone";

describe("timezone business days", () => {
  it("a 9pm Texas sale lands on its local day, not the next UTC day", () => {
    // 2026-10-29 02:00 UTC = 2026-10-28 21:00 CDT
    expect(zonedParts("2026-10-29T02:00:00Z", "America/Chicago").date).toBe("2026-10-28");
    expect(zonedParts("2026-10-29T02:00:00Z", "UTC").date).toBe("2026-10-29");
  });

  it("local hour follows the zone", () => {
    expect(zonedParts("2026-10-29T02:00:00Z", "America/Chicago").hour).toBe(21);
  });

  it("local midnight converts to the right UTC instant across DST", () => {
    expect(zonedTimeToUtc("2026-07-01", "America/Chicago").toISOString()).toBe("2026-07-01T05:00:00.000Z");
    expect(zonedTimeToUtc("2026-12-01", "America/Chicago").toISOString()).toBe("2026-12-01T06:00:00.000Z");
    expect(zonedTimeToUtc("2026-12-01", "UTC").toISOString()).toBe("2026-12-01T00:00:00.000Z");
  });

  it("unknown zones fall back to UTC", () => {
    expect(safeTimeZone("Mars/Base")).toBe("UTC");
  });
});
