// eGiving community split rules (pure, shared by watcher + tests).
// A merchant who opted in accepts a single send-to-many TSD payment whose
// merchant slice is at least (100 - discount)% of the invoice as paid in full.

/**
 * The community discount is fixed at 10% for now. The eGiving wallet hard-codes
 * its split (8% church + 2% program), so every opted-in store must expect the
 * same 90% merchant slice. The per-store `egiving_discount_pct` column still
 * exists and is shown to merchants, but it is no longer editable and is
 * deliberately NOT read here — a stray or hand-set value in that column must
 * never change what counts as paid in full.
 */
export const EGIVING_DISCOUNT_PCT = 10;

/**
 * NectarGive (HME Give) admin wallet — receives the program share (2% of the
 * sale, i.e. 20% of the donation). Hard-coded: it is the only address that
 * counts as the program share; program rows in the recipient list are ignored.
 */
export const EGIVING_PROGRAM_ADDRESS = "ToaRhmGqAW7PyvPJvbLJo69mnZwhaaA1vu";

export interface EgivingStore {
  egiving_enabled?: boolean | null;
  /** Display only — settlement always uses EGIVING_DISCOUNT_PCT. */
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
  /** Merchant (invoice) address. */
  merchantAddress?: string;
  /** All send-to-many recipients of the transaction (TSD = USD). */
  recipients?: Array<{ address: string | null; amount: number }>;
  /** Registered, active giving addresses. */
  registry?: Map<string, "church" | "program">;
}): EgivingDecision {
  const none: EgivingDecision = { amountDueUsd: opts.invoiceUsd, program: null, discountUsd: 0, discountPct: 0 };
  if (!opts.sendToMany || !opts.store?.egiving_enabled) return none;
  if ((opts.tokenSymbol ?? "").toUpperCase() !== "TSD") return none;
  const pct = EGIVING_DISCOUNT_PCT;
  const minimum = round2(opts.invoiceUsd * (1 - pct / 100));
  // One transaction must cover the whole merchant share; no tolerance below it.
  if (opts.creditUsd + 1e-9 < minimum) return none;
  // The giving must be real: every other output goes to a registered church
  // or the program, with exactly one program output and at least one church,
  // and the whole split adds up to the invoice.
  if (!opts.recipients || !opts.registry || !opts.merchantAddress) return none;
  let churches = 0;
  let programs = 0;
  let total = 0;
  for (const r of opts.recipients) {
    total += r.amount;
    if (r.address === opts.merchantAddress) continue;
    const kind = r.address === EGIVING_PROGRAM_ADDRESS ? "program"
      : r.address && opts.registry.get(r.address) === "church" ? "church" : undefined;
    if (kind === "church") churches++;
    else if (kind === "program") programs++;
    else return none;
  }
  if (churches < 1 || programs !== 1) return none;
  if (total + 0.005 < opts.invoiceUsd) return none;
  // Full payment (or more) through a split is just a normal payment.
  if (opts.creditUsd >= opts.invoiceUsd) return none;
  return { amountDueUsd: minimum, program: "egiving", discountUsd: round2(opts.invoiceUsd - minimum), discountPct: pct };
}
