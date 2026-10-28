ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS egiving_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS egiving_discount_pct numeric NOT NULL DEFAULT 10;
ALTER TABLE public.stores
  ADD CONSTRAINT stores_egiving_discount_pct_range CHECK (egiving_discount_pct >= 0 AND egiving_discount_pct <= 50);
GRANT SELECT (egiving_enabled, egiving_discount_pct) ON public.stores TO authenticated;
GRANT UPDATE (egiving_enabled, egiving_discount_pct) ON public.stores TO authenticated;
GRANT INSERT (egiving_enabled, egiving_discount_pct) ON public.stores TO authenticated;

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS payment_program text,
  ADD COLUMN IF NOT EXISTS discount_usd numeric,
  ADD COLUMN IF NOT EXISTS discount_pct numeric;