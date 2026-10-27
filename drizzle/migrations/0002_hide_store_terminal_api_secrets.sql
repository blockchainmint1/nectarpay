DO $$
DECLARE
  t text;
  cols text;
  secret_cols text[];
BEGIN
  FOREACH t IN ARRAY ARRAY['stores','terminals','api_keys'] LOOP
    secret_cols := CASE t
      WHEN 'stores' THEN ARRAY['webhook_secret','webhook_secret_hash','kyc_advanced_api_key','kyc_advanced_app_token']
      WHEN 'terminals' THEN ARRAY['hmac_secret_hash']
      ELSE ARRAY['secret_hash'] END;
    EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM PUBLIC, anon, authenticated', t);
    SELECT string_agg(quote_ident(column_name), ', ' ORDER BY ordinal_position)
      INTO cols
      FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = t AND column_name <> ALL(secret_cols);
    EXECUTE format('GRANT SELECT (%s), INSERT (%s), UPDATE (%s) ON public.%I TO authenticated', cols, cols, cols, t);
    EXECUTE format('GRANT DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
  END LOOP;
END $$;

-- API key creation stores only the one-way fingerprint; users may write it but never read it.
GRANT INSERT (secret_hash) ON public.api_keys TO authenticated;