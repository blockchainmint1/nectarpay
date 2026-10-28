// eGiving community split rules (pure, shared by watcher + tests).
// A merchant who opted in accepts a single send-to-many TSD payment whose
// merchant slice is at least (100 - discount)% of the invoice as paid in full.

export interface EgivingStore {
  egiving_enabled?: boolean | null;
  egiving_discount_pct?: number | string | null;
}

export interface EgivingDecision {
  /** Amount the invoice must reach to count as paid (USD). */
  amountDueUsd: number;
  program: "egiving" | null;
  discountUsd: number;
  discountPct: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function egivingDecision(opts: {
  store: EgivingStore | null | undefined;
  tokenSymbol: string | null | undefined;
  sendToMany: boolean;
  creditUsd: number;
  invoiceUsd: number;
}): EgivingDecision {
  const none: EgivingDecision = { amountDueUsd: opts.invoiceUsd, program: null, discountUsd: 0, discountPct: 0 };
  if (!opts.sendToMany || !opts.store?.egiving_enabled) return none;
  if ((opts.tokenSymbol ?? "").toUpperCase() !== "TSD") return none;
  const pct = Number(opts.store.egiving_discount_pct ?? 10);
  if (!Number.isFinite(pct) || pct <= 0 || pct > 50) return none;
  const minimum = round2(opts.invoiceUsd * (1 - pct / 100));
  // One transaction must cover the whole merchant share; no tolerance below it.
  if (opts.creditUsd + 1e-9 < minimum) return none;
  // Full payment (or more) through a split is just a normal payment.
  if (opts.creditUsd >= opts.invoiceUsd) return none;
  return { amountDueUsd: minimum, program: "egiving", discountUsd: round2(opts.invoiceUsd - minimum), discountPct: pct };
}
