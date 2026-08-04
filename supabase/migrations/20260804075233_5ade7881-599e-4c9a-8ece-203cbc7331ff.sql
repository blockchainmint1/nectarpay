ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS tsd_instant boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS tsd_instant_max_usd numeric DEFAULT 250;