CREATE TABLE public.platform_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.platform_settings TO authenticated, anon;
GRANT ALL ON public.platform_settings TO service_role;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read platform settings" ON public.platform_settings FOR SELECT TO anon, authenticated USING (true);

INSERT INTO public.platform_settings(key, value) VALUES ('lightning_enabled', 'false'::jsonb);

CREATE OR REPLACE FUNCTION public.block_lightning_when_disabled()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.chain = 'lightning' AND NEW.enabled AND NOT COALESCE(
    (SELECT (value)::text::boolean FROM public.platform_settings WHERE key = 'lightning_enabled'), false) THEN
    NEW.enabled := false;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER chain_configs_block_lightning
BEFORE INSERT OR UPDATE ON public.chain_configs
FOR EACH ROW EXECUTE FUNCTION public.block_lightning_when_disabled();

UPDATE public.chain_configs SET enabled = false WHERE chain = 'lightning' AND enabled;