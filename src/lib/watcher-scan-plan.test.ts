import { describe, expect, it } from "vitest";
import { planOpenAddressScans } from "./watcher-scan-plan";

const GRACE = 10 * 60 * 1000;

describe("planOpenAddressScans", () => {
  it("scans nothing when no Solana/Tron sale is open", () => {
    expect(planOpenAddressScans(["A", "B", "C"], [], GRACE).size).toBe(0);
  });

  it("scans only wallets that have an open sale", () => {
    const plan = planOpenAddressScans(
      ["A", "B", "C"],
      [{ address: "B", created_at: "2026-11-15T20:00:00Z" }],
      GRACE,
    );
    expect([...plan.keys()]).toEqual(["B"]);
  });

  it("uses the oldest open sale minus the 10-minute grace as the cutoff", () => {
    const plan = planOpenAddressScans(
      ["A"],
      [
        { address: "A", created_at: "2026-11-15T20:30:00Z" },
        { address: "A", created_at: "2026-11-15T20:00:00Z" },
      ],
      GRACE,
    );
    expect(plan.get("A")).toBe(Date.parse("2026-11-15T19:50:00Z"));
  });

  it("ignores open sales on wallets the watcher does not track", () => {
    const plan = planOpenAddressScans(["A"], [{ address: "Z", created_at: "2026-11-15T20:00:00Z" }], GRACE);
    expect(plan.size).toBe(0);
  });
});
