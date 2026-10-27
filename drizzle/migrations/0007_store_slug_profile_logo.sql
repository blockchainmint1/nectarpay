ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS url_slug text,
  ADD COLUMN IF NOT EXISTS business_phone text,
  ADD COLUMN IF NOT EXISTS business_presence text NOT NULL DEFAULT 'physical'
    CHECK (business_presence IN ('physical','online','both'));

CREATE OR REPLACE FUNCTION public.store_slugify(_name text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT coalesce(nullif(trim(both '-' from left(regexp_replace(lower(coalesce(_name,'')), '[^a-z0-9]+', '-', 'g'), 40)), ''), 'store')
$$;

CREATE OR REPLACE FUNCTION public.stores_assign_slug()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE base text; cand text; n int := 1;
BEGIN
  IF NEW.url_slug IS NOT NULL AND NEW.url_slug <> '' THEN
    base := public.store_slugify(NEW.url_slug);
  ELSE
    base := public.store_slugify(NEW.name);
  END IF;
  -- never let a slug look like a UUID
  IF base ~ '^[0-9a-f]{8}-' THEN base := 'store-' || base; END IF;
  cand := base;
  WHILE EXISTS (SELECT 1 FROM public.stores WHERE url_slug = cand AND id <> NEW.id) LOOP
    n := n + 1; cand := base || '-' || n;
  END LOOP;
  NEW.url_slug := cand;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS stores_assign_slug ON public.stores;
CREATE TRIGGER stores_assign_slug BEFORE INSERT OR UPDATE OF url_slug ON public.stores
  FOR EACH ROW EXECUTE FUNCTION public.stores_assign_slug();

DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT id FROM public.stores ORDER BY created_at LOOP
    UPDATE public.stores SET url_slug = '' WHERE id = r.id;
  END LOOP;
END $$;

ALTER TABLE public.stores ALTER COLUMN url_slug SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS stores_url_slug_key ON public.stores(url_slug);

CREATE POLICY "Store managers read logos" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'store-logos' AND public.store_access_level(((storage.foldername(name))[1])::uuid) >= 1);
CREATE POLICY "Store managers upload logos" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'store-logos' AND public.store_access_level(((storage.foldername(name))[1])::uuid) >= 2);
CREATE POLICY "Store managers update logos" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'store-logos' AND public.store_access_level(((storage.foldername(name))[1])::uuid) >= 2);
CREATE POLICY "Store managers delete logos" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'store-logos' AND public.store_access_level(((storage.foldername(name))[1])::uuid) >= 2);