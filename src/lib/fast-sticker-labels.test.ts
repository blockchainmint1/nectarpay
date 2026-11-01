import { describe, expect, it } from "vitest";
import { FAST_LABEL_TEMPLATES, labelPlacements } from "./fast-sticker-labels";

describe("Avery merchant sheets", () => {
  it("places all 30 Avery 5160 labels within US Letter", () => {
    const t = FAST_LABEL_TEMPLATES[0];
    const labels = labelPlacements(t, 30, 1);
    expect(labels).toHaveLength(30);
    expect(labels[0].x).toBe(13.5);
    expect(labels[0].y).toBe(684);
    expect(labels[29].page).toBe(0);
    for (const l of labels) { expect(l.x + l.width).toBeLessThanOrEqual(612); expect(l.y).toBeGreaterThanOrEqual(0); }
  });
  it("uses 4 by 2 inch Avery 5163 labels, 10 per sheet", () => {
    const t = FAST_LABEL_TEMPLATES[1];
    const labels = labelPlacements(t, 11, 1);
    expect(labels[0].width).toBe(288);
    expect(labels[0].height).toBe(144);
    expect(labels[1].x).toBe(312.75);
    expect(labels[10].page).toBe(1);
  });
  it("skips used labels and carries remaining stickers to another page", () => {
    const labels = labelPlacements(FAST_LABEL_TEMPLATES[1], 3, 9);
    expect(labels.map((l) => [l.page, l.slot])).toEqual([[0, 8], [0, 9], [1, 0]]);
  });
  it("rejects invalid quantities and start positions", () => {
    expect(() => labelPlacements(FAST_LABEL_TEMPLATES[1], 0, 1)).toThrow();
    expect(() => labelPlacements(FAST_LABEL_TEMPLATES[1], 501, 1)).toThrow();
    expect(() => labelPlacements(FAST_LABEL_TEMPLATES[1], 10, 11)).toThrow();
  });
});