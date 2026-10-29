export type SortDir = "asc" | "desc";

export type SortState<K extends string = string> = { key: K; dir: SortDir };

export type SortValue = number | string | Date | null | undefined;

export type SortAccessors<T, K extends string> = Record<K, (row: T) => SortValue>;

/** Blank / missing / invalid values normalise to null so they can be pushed to the bottom. */
function normalize(v: SortValue): number | string | null {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v.getTime();
  if (typeof v === "number") return Number.isNaN(v) ? null : v;
  const s = String(v).trim();
  return s === "" ? null : s;
}

/** Clicking the same heading flips direction; clicking a new heading starts it ascending. */
export function toggleSort<K extends string>(state: SortState<K>, key: K): SortState<K> {
  if (state.key !== key) return { key, dir: "asc" };
  return { key, dir: state.dir === "asc" ? "desc" : "asc" };
}

/**
 * Sorts rows by one column. Rows with nothing in that column always sink to the
 * bottom, whichever way the column is pointing, so blanks never crowd out real data.
 */
export function sortRows<T, K extends string>(
  rows: readonly T[],
  state: SortState<K>,
  accessors: SortAccessors<T, K>,
): T[] {
  const get = accessors[state.key];
  if (!get) return [...rows];

  const filled: T[] = [];
  const blank: T[] = [];
  for (const row of rows) (normalize(get(row)) === null ? blank : filled).push(row);

  const dir = state.dir === "asc" ? 1 : -1;
  filled.sort((a, b) => {
    const av = normalize(get(a)) as number | string;
    const bv = normalize(get(b)) as number | string;
    let cmp: number;
    if (typeof av === "number" && typeof bv === "number") cmp = av - bv;
    else if (typeof av === "number") cmp = -1;
    else if (typeof bv === "number") cmp = 1;
    else cmp = String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: "base" });
    return cmp * dir;
  });

  return [...filled, ...blank];
}
