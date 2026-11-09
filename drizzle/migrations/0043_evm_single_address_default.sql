ALTER TABLE public.stores ALTER COLUMN evm_address_rotation SET DEFAULT false;
COMMENT ON COLUMN public.stores.evm_address_rotation IS 'true = fresh EVM address per sale; false = every EVM sale paid to the main address #0 with strict amount-tail matching. New stores default to false.';

CREATE TABLE public.unmatched_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  chain text NOT NULL,
  address text NOT NULL,
  tx_hash text NOT NULL,
  token_symbol text,
  amount numeric NOT NULL,
  confirmations integer NOT NULL DEFAULT 0,
  block_height bigint,
  block_time timestamptz,
  reason text NOT NULL DEFAULT 'no_match',
  resolved_invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  resolved_by uuid,
  dismissed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (chain, tx_hash, address)
);
CREATE INDEX unmatched_payments_store_open_idx ON public.unmatched_payments (store_id, created_at DESC)
  WHERE resolved_invoice_id IS NULL AND dismissed_at IS NULL;

GRANT SELECT ON public.unmatched_payments TO authenticated;
GRANT ALL ON public.unmatched_payments TO service_role;

ALTER TABLE public.unmatched_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Store team views unmatched payments"
  ON public.unmatched_payments FOR SELECT TO authenticated
  USING (public.owns_store(store_id) OR public.store_access_level(store_id) > 0);