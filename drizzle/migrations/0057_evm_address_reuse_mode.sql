ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS evm_address_reuse boolean NOT NULL DEFAULT true;
COMMENT ON COLUMN public.stores.evm_address_reuse IS 'Only used when evm_address_rotation = true: true = rotate and recycle idle addresses, false = rotate and never hand an address to a second sale.';
GRANT SELECT (evm_address_reuse), INSERT (evm_address_reuse), UPDATE (evm_address_reuse) ON public.stores TO authenticated;
GRANT ALL ON public.stores TO service_role;