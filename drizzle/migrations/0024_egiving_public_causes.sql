ALTER TABLE public.egiving_recipients
  ADD COLUMN code text,
  ADD COLUMN city text,
  ADD COLUMN blurb text,
  ADD COLUMN featured boolean NOT NULL DEFAULT false;
ALTER TABLE public.egiving_recipients ADD CONSTRAINT egiving_code_format CHECK (code IS NULL OR code ~ '^[A-Za-z0-9]{2,12}$');
ALTER TABLE public.egiving_recipients ADD CONSTRAINT egiving_blurb_len CHECK (blurb IS NULL OR length(blurb) <= 500);
CREATE UNIQUE INDEX egiving_recipients_code_ci ON public.egiving_recipients (lower(code)) WHERE code IS NOT NULL;

CREATE OR REPLACE FUNCTION public.get_public_egiving_causes()
RETURNS TABLE(code text, name text, city text, blurb text, address text, featured boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT upper(r.code), r.name, r.city, r.blurb, r.address, r.featured
  FROM public.egiving_recipients r
  WHERE r.active AND r.kind = 'church'
  ORDER BY r.featured DESC, r.name;
$$;
REVOKE ALL ON FUNCTION public.get_public_egiving_causes() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_egiving_causes() TO anon, authenticated, service_role;