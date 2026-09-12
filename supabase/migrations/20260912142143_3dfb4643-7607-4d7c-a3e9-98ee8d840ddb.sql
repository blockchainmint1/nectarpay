ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS evm_address_rotation boolean NOT NULL DEFAULT true;