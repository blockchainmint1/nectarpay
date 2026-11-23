// Splits a chain's sale addresses into server-call-sized pages for the
// wallet balance total. Browser-safe (no server imports).

export const BALANCE_PAGE_SIZE = 10;

export interface BalancePageChain {
  derived: boolean;
  firstIndex: number;
  lastIndex: number;
}

/** Every address from firstIndex to lastIndex inclusive, in pages; a static address is one page. */
export function balancePages(c: BalancePageChain): { start: number; count: number }[] {
  if (!c.derived) return [{ start: 0, count: 1 }];
  const pages: { start: number; count: number }[] = [];
  const last = Math.max(c.firstIndex, c.lastIndex);
  for (let start = c.firstIndex; start <= last; start += BALANCE_PAGE_SIZE) {
    pages.push({ start, count: Math.min(BALANCE_PAGE_SIZE, last - start + 1) });
  }
  return pages;
}

/**
 * First address a wallet balance counts: #0 for single-address EVM stores or
 * when any sale was paid to #0 (older stores' first sales), else #1.
 */
export function firstBalanceIndex(o: {
  isEvm: boolean;
  evmSingle: boolean;
  lowestSaleIndex: number | null;
}): number {
  if (o.isEvm && o.evmSingle) return 0;
  if (o.lowestSaleIndex !== null && o.lowestSaleIndex <= 0) return 0;
  return 1;
}
