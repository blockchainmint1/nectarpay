import { describe, expect, it } from "vitest";
import { sortRows, toggleSort, type SortAccessors } from "./table-sort";

type Row = { name: string; sales: number | null; signed_up: string | null };

const rows: Row[] = [
  { name: "Beta", sales: 500, signed_up: "2026-03-01" },
  { name: "alpha", sales: null, signed_up: null },
  { name: "Store 10", sales: 12000, signed_up: "2026-01-15" },
  { name: "Store 2", sales: 90, signed_up: "2026-11-30" },
  { name: "Gamma", sales: 75, signed_up: "2025-07-04" },
];

const get: SortAccessors<Row, keyof Row> = {
  name: (r) => r.name,
  sales: (r) => r.sales,
  signed_up: (r) => (r.signed_up ? new Date(r.signed_up) : null),
};

const names = (r: Row[]) => r.map((x) => x.name);

describe("sortRows", () => {
  it("sorts money high-to-low and low-to-high", () => {
    expect(names(sortRows(rows, { key: "sales", dir: "desc" }, get))).toEqual([
      "Store 10",
      "Beta",
      "Store 2",
      "Gamma",
      "alpha",
    ]);
    expect(names(sortRows(rows, { key: "sales", dir: "asc" }, get))).toEqual([
      "Gamma",
      "Store 2",
      "Beta",
      "Store 10",
      "alpha",
    ]);
  });

  it("keeps rows with no value at the bottom whichever way the column points", () => {
    expect(names(sortRows(rows, { key: "sales", dir: "asc" }, get)).at(-1)).toBe("alpha");
    expect(names(sortRows(rows, { key: "sales", dir: "desc" }, get)).at(-1)).toBe("alpha");
    expect(names(sortRows(rows, { key: "signed_up", dir: "asc" }, get)).at(-1)).toBe("alpha");
  });

  it("sorts sign-up dates chronologically", () => {
    expect(names(sortRows(rows, { key: "signed_up", dir: "asc" }, get))).toEqual([
      "Gamma",
      "Store 10",
      "Beta",
      "Store 2",
      "alpha",
    ]);
  });

  it("reads names without caring about capital letters and counts digits as numbers", () => {
    expect(names(sortRows(rows, { key: "name", dir: "asc" }, get))).toEqual([
      "alpha",
      "Beta",
      "Gamma",
      "Store 2",
      "Store 10",
    ]);
  });

  it("leaves the list untouched when asked to sort by a column it doesn't know", () => {
    expect(names(sortRows(rows, { key: "nope", dir: "asc" }, get as never))).toEqual(
      names(rows),
    );
  });
});

describe("toggleSort", () => {
  it("flips direction when the same heading is clicked again", () => {
    expect(toggleSort({ key: "sales", dir: "asc" }, "sales")).toEqual({ key: "sales", dir: "desc" });
    expect(toggleSort({ key: "sales", dir: "desc" }, "sales")).toEqual({ key: "sales", dir: "asc" });
  });

  it("starts a new column ascending", () => {
    expect(toggleSort({ key: "sales", dir: "desc" }, "name")).toEqual({ key: "name", dir: "asc" });
  });
});
