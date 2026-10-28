-- The eGiving community discount is fixed at 10% for now: the eGiving wallet
-- hard-codes its 8% church / 2% program split, so a per-store value would
-- break the wallet's fixed split. The column stays (all 171 rows hold 10) and
-- stays readable for display, but merchants can no longer write it. Settlement
-- uses EGIVING_DISCOUNT_PCT in src/lib/egiving.ts, not this column.
REVOKE UPDATE (egiving_discount_pct) ON public.stores FROM authenticated;
REVOKE INSERT (egiving_discount_pct) ON public.stores FROM authenticated;
COMMENT ON COLUMN public.stores.egiving_discount_pct IS 'DEPRECATED FOR WRITES: fixed at 10% (EGIVING_DISCOUNT_PCT in src/lib/egiving.ts). Read-only to authenticated until per-store discounts are designed.';