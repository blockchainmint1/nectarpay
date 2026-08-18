CREATE TABLE public.public_terminals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$'),
  title text,
  subtitle text,
  cta_label text,
  currency text,
  preset_amounts numeric[] NOT NULL DEFAULT '{}',
  allow_custom_amount boolean NOT NULL DEFAULT true,
  min_amount numeric NOT NULL DEFAULT 1,
  max_amount numeric NOT NULL DEFAULT 10000,
  is_donation boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  view_count integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX public_terminals_store_id_idx ON public.public_terminals(store_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.public_terminals TO authenticated;
GRANT ALL ON public.public_terminals TO service_role;

ALTER TABLE public.public_terminals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their public terminals"
ON public.public_terminals FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.public_terminals_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER public_terminals_updated_at
BEFORE UPDATE ON public.public_terminals
FOR EACH ROW EXECUTE FUNCTION public.public_terminals_touch_updated_at();