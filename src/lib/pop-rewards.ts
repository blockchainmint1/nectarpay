// POP reward rules. POP are non-spendable patronage points: 1 POP per US dollar
// of the full sale (before any Give Back discount), whole units rounded up.

export const POP_NEW_STORE_HOLD_DAYS = 14;
export const POP_SHOPPER_STORE_DAILY_CAP = 250;
export const POP_STORE_DAILY_CAP = 5000;
export const POP_CLAIM_WINDOW_DAYS = 30;
export const POP_PAID_STATUSES = ["confirmed", "overpaid"];

export function popForAmount(usd: number): number {
  if (!Number.isFinite(usd) || usd <= 0) return 0;
  return Math.ceil(Math.round(usd * 100) / 100 - 1e-9);
}

export type AwardInput = {
  invoiceStatus: string;
  fiatCurrency: string;
  saleUsd: number;
  paidAt: Date;
  storeCreatedAt: Date;
  storeEnabled: boolean;
  /** Shopper's email (SHA-256, lowercased) matched the store owner's or the store's public email. */
  shopperIsOwner: boolean;
  /** A paying address is one of the store's own receiving addresses. */
  payerIsStoreWallet: boolean;
  shopperStorePopToday: number;
  storePopToday: number;
  now: Date;
};

export type AwardDecision = { status: "eligible" | "held" | "denied"; pop: number; reason: string | null; releaseAt: Date | null };

const DAY = 86_400_000;

export function decideAward(i: AwardInput): AwardDecision {
  const pop = popForAmount(i.saleUsd);
  const deny = (reason: string): AwardDecision => ({ status: "denied", pop: 0, reason, releaseAt: null });
  if (!POP_PAID_STATUSES.includes(i.invoiceStatus)) return deny("sale_not_paid");
  if (i.fiatCurrency.toUpperCase() !== "USD") return deny("not_usd");
  if (pop <= 0) return deny("zero_amount");
  if (!i.storeEnabled) return deny("store_not_eligible");
  if (i.now.getTime() - i.paidAt.getTime() > POP_CLAIM_WINDOW_DAYS * DAY) return deny("claim_window_expired");
  if (i.shopperIsOwner) return deny("own_store");
  if (i.payerIsStoreWallet) return deny("own_store");
  if (i.shopperStorePopToday + pop > POP_SHOPPER_STORE_DAILY_CAP) return { status: "held", pop, reason: "shopper_daily_cap", releaseAt: null };
  if (i.storePopToday + pop > POP_STORE_DAILY_CAP) return { status: "held", pop, reason: "store_daily_cap", releaseAt: null };
  const release = new Date(i.storeCreatedAt.getTime() + POP_NEW_STORE_HOLD_DAYS * DAY);
  if (release > i.now) return { status: "held", pop, reason: "new_store", releaseAt: release };
  return { status: "eligible", pop, reason: null, releaseAt: null };
}
