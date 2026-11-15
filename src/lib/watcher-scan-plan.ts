// Which shared single-address wallets (Solana/Tron) the watcher should scan
// this tick. Only wallets with an open sale are worth an RPC call, and only
// on-chain activity newer than that wallet's oldest open sale (minus the
// pre-invoice grace) can ever match, so older history is skipped entirely.

export interface OpenInvoiceRef {
  address: string | null;
  created_at: string | null;
}

/** Map of address → earliest on-chain time (ms) that could still pay an open sale. */
export function planOpenAddressScans(
  watched: readonly string[],
  openInvoices: readonly OpenInvoiceRef[],
  graceMs: number,
): Map<string, number> {
  const watchedSet = new Set(watched);
  const plan = new Map<string, number>();
  for (const inv of openInvoices) {
    if (!inv.address || !watchedSet.has(inv.address)) continue;
    const created = inv.created_at ? Date.parse(inv.created_at) : NaN;
    // Unknown creation time: scan full recent history for that wallet.
    const notBefore = Number.isFinite(created) ? created - graceMs : 0;
    const prev = plan.get(inv.address);
    plan.set(inv.address, prev == null ? notBefore : Math.min(prev, notBefore));
  }
  return plan;
}
