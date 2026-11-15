CREATE TABLE public.public_rate_counters (
  bucket text NOT NULL,
  subject_hash text NOT NULL,
  window_start timestamptz NOT NULL,
  hits integer NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket, subject_hash, window_start)
);
GRANT ALL ON public.public_rate_counters TO service_role;
ALTER TABLE public.public_rate_counters ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.bump_public_rate(_bucket text, _subject_hash text, _window_seconds integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  w timestamptz := to_timestamp(floor(extract(epoch FROM now()) / _window_seconds) * _window_seconds);
  n integer;
BEGIN
  INSERT INTO public.public_rate_counters (bucket, subject_hash, window_start, hits)
  VALUES (_bucket, _subject_hash, w, 1)
  ON CONFLICT (bucket, subject_hash, window_start)
  DO UPDATE SET hits = public.public_rate_counters.hits + 1
  RETURNING hits INTO n;
  IF random() < 0.02 THEN
    DELETE FROM public.public_rate_counters WHERE window_start < now() - interval '1 day';
  END IF;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.bump_public_rate(text, text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bump_public_rate(text, text, integer) TO service_role;

CREATE UNIQUE INDEX invoices_open_shared_amount_unique
  ON public.invoices (lower(address), (coalesce(upper(token_symbol), '')), crypto_amount)
  WHERE status IN ('pending', 'detected', 'underpaid')
    AND address IS NOT NULL
    AND crypto_amount IS NOT NULL
    AND chain IN ('eth', 'base', 'bsc', 'zcu', 'sol', 'tron');