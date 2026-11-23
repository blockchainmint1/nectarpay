// Before an unpaid sale is marked expired, Ethereum / Base sales get one last
// look at the blockchain. The minute-by-minute watcher can miss a transfer
// (for example when the blockchain data provider is a little behind), and an
// expired sale can no longer be credited automatically — so the final check
// is the safety net. Pure planning helper (no I/O) so the rule is tested.

export const FINAL_CHECK_CHAINS: readonly string[] = ["eth", "base", "bsc"];

/** How many final checks one watcher run may do; the rest wait a minute. */
export const FINAL_CHECKS_PER_RUN = 8;

export interface ExpiringSale {
  id: string;
  chain: string | null;
  address: string | null;
}

export function planExpiry(
  due: ExpiringSale[],
  maxChecks: number = FINAL_CHECKS_PER_RUN,
): { check: string[]; expire: string[]; hold: string[] } {
  const check: string[] = [];
  const expire: string[] = [];
  const hold: string[] = [];
  for (const sale of due) {
    const needsCheck = !!sale.address && !!sale.chain && FINAL_CHECK_CHAINS.includes(sale.chain);
    if (!needsCheck) expire.push(sale.id);
    else if (check.length < maxChecks) check.push(sale.id);
    else hold.push(sale.id);
  }
  return { check, expire, hold };
}
