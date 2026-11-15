// Two open sales on one shared address (single-address EVM, Solana, static
// Tron) must never ask for the same amount. The database refuses the second
// with this unique index; the writer then derives a fresh amount tail.
export const OPEN_AMOUNT_INDEX = "invoices_open_shared_amount_unique";
export const OPEN_AMOUNT_ATTEMPTS = 3;

export function isOpenAmountCollision(err: { code?: string | null; message?: string | null } | null | undefined): boolean {
  return !!err && err.code === "23505" && (err.message ?? "").includes(OPEN_AMOUNT_INDEX);
}
