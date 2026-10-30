import { describe, it, expect } from "vitest";
import { normalizeCoinId, coinIdMatchesAddress } from "./fast-enroll";

describe("fast enrollment coin IDs", () => {
  it("keeps case and requires exactly 6 characters", () => {
    expect(normalizeCoinId(" oaRhmG ")).toBe("oaRhmG");
    expect(normalizeCoinId("12345")).toBeNull();
  });
  it("sticker code must be the 6 characters after the leading T", () => {
    expect(coinIdMatchesAddress("oaRhmG", "ToaRhmGqAW7PyvPJvbLJo69mnZwhaaA1vu")).toBe(true);
    expect(coinIdMatchesAddress("OARHMG", "ToaRhmGqAW7PyvPJvbLJo69mnZwhaaA1vu")).toBe(false);
  });
});
