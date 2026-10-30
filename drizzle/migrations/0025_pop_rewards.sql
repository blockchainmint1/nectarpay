ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS pop_rewards_enabled boolean NOT NULL DEFAULT true;
COMMENT ON COLUMN public.stores.pop_rewards_enabled IS 'Admin-only switch: when false, sales at this store never earn POP.';

CREATE TABLE public.pop_awards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL UNIQUE REFERENCES public.invoices(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  partner_id uuid REFERENCES public.card_partners(id) ON DELETE SET NULL,
  txid text NOT NULL,
  shopper_ref text NOT NULL,
  sale_usd numeric(12,2) NOT NULL,
  pop integer NOT NULL CHECK (pop >= 0),
  status text NOT NULL CHECK (status IN ('eligible','held','denied')),
  reason text,
  release_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX pop_awards_shopper_day ON public.pop_awards (shopper_ref, store_id, created_at);
CREATE INDEX pop_awards_store_day ON public.pop_awards (store_id, created_at);

GRANT SELECT ON public.pop_awards TO authenticated;
GRANT ALL ON public.pop_awards TO service_role;
ALTER TABLE public.pop_awards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read POP awards" ON public.pop_awards FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));