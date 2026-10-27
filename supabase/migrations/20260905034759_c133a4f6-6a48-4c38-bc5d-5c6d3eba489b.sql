-- Lightning invoices issued on the shared node
CREATE TABLE public.lightning_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  payment_hash TEXT NOT NULL UNIQUE,
  payment_request TEXT NOT NULL UNIQUE,
  amount_sats BIGINT NOT NULL,
  amount_paid_sats BIGINT NOT NULL DEFAULT 0,
  state TEXT NOT NULL DEFAULT 'open',
  settled_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX lightning_invoices_store_idx ON public.lightning_invoices(store_id);
CREATE INDEX lightning_invoices_state_idx ON public.lightning_invoices(state);
CREATE INDEX lightning_invoices_invoice_idx ON public.lightning_invoices(invoice_id);

GRANT SELECT ON public.lightning_invoices TO authenticated;
GRANT ALL ON public.lightning_invoices TO service_role;
ALTER TABLE public.lightning_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Store owners can view their lightning invoices"
  ON public.lightning_invoices FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = lightning_invoices.store_id AND s.owner_id = auth.uid()));

-- Sweeps of pooled Lightning liquidity out to the merchant's on-chain address
CREATE TABLE public.lightning_sweeps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  amount_sats BIGINT NOT NULL,
  fee_sats BIGINT,
  address TEXT NOT NULL,
  txid TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);
CREATE INDEX lightning_sweeps_store_idx ON public.lightning_sweeps(store_id);

GRANT SELECT ON public.lightning_sweeps TO authenticated;
GRANT ALL ON public.lightning_sweeps TO service_role;
ALTER TABLE public.lightning_sweeps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Store owners can view their lightning sweeps"
  ON public.lightning_sweeps FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = lightning_sweeps.store_id AND s.owner_id = auth.uid()));

-- Ledger of sats owed to each merchant from settled Lightning payments
CREATE TABLE public.lightning_credits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  lightning_invoice_id UUID REFERENCES public.lightning_invoices(id) ON DELETE SET NULL,
  amount_sats BIGINT NOT NULL,
  sweep_id UUID REFERENCES public.lightning_sweeps(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX lightning_credits_store_idx ON public.lightning_credits(store_id);
CREATE INDEX lightning_credits_unswept_idx ON public.lightning_credits(store_id) WHERE sweep_id IS NULL;

GRANT SELECT ON public.lightning_credits TO authenticated;
GRANT ALL ON public.lightning_credits TO service_role;
ALTER TABLE public.lightning_credits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Store owners can view their lightning credits"
  ON public.lightning_credits FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = lightning_credits.store_id AND s.owner_id = auth.uid()));

-- Sweep threshold per store
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS ln_sweep_threshold_sats BIGINT NOT NULL DEFAULT 100000;