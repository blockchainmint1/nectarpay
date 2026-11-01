export type LabelTemplate = { id: string; name: string; width: number; height: number; columns: number; rows: number; left: number; top: number; pitchX: number; pitchY: number };
// US Letter dimensions in inches. Avery sizes; placement cross-checked against
// LibreOffice extras/source/labels/labels.xml (Avery Letter Size, 5160/5163).
export const FAST_LABEL_TEMPLATES: LabelTemplate[] = [
  { id: "5160", name: 'Avery 5160 / 8160 · 2⅝″ × 1″ · 30 labels', width: 2.625, height: 1, columns: 3, rows: 10, left: 0.1875, top: 0.5, pitchX: 2.75, pitchY: 1 },
  { id: "5163", name: 'Avery 5163 / 8163 · 4″ × 2″ · 10 labels', width: 4, height: 2, columns: 2, rows: 5, left: 0.15625, top: 0.5, pitchX: 4.1875, pitchY: 2 },
];

export function labelPlacements(template: LabelTemplate, quantity: number, startPosition: number, offsetX = 0, offsetY = 0) {
  const capacity = template.columns * template.rows;
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 500) throw new Error("Choose 1–500 stickers.");
  if (!Number.isInteger(startPosition) || startPosition < 1 || startPosition > capacity) throw new Error(`Start label must be 1–${capacity}.`);
  if (![offsetX, offsetY].every((n) => Number.isFinite(n) && Math.abs(n) <= 5)) throw new Error("Adjustments must be within 5 mm.");
  return Array.from({ length: quantity }, (_, i) => {
    const index = startPosition - 1 + i;
    const slot = index % capacity;
    return { page: Math.floor(index / capacity), slot, x: (template.left + slot % template.columns * template.pitchX) * 72 + offsetX * 72 / 25.4,
      y: 792 - (template.top + Math.floor(slot / template.columns) * template.pitchY + template.height) * 72 - offsetY * 72 / 25.4,
      width: template.width * 72, height: template.height * 72 };
  });
}