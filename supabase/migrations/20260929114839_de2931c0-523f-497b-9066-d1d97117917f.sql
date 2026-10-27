CREATE TABLE public.api_rate_counters (
  key_id uuid NOT NULL,
  window_start timestamptz NOT NULL,
  hits integer NOT NULL DEFAULT 0,
  PRIMARY KEY (key_id, window_start)
);
GRANT ALL ON public.api_rate_counters TO service_role;
ALTER TABLE public.api_rate_counters ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.api_rate_hit(_key_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE w timestamptz := date_trunc('minute', now()); n integer;
BEGIN
  INSERT INTO api_rate_counters(key_id, window_start, hits) VALUES (_key_id, w, 1)
  ON CONFLICT (key_id, window_start) DO UPDATE SET hits = api_rate_counters.hits + 1
  RETURNING hits INTO n;
  IF random() < 0.01 THEN DELETE FROM api_rate_counters WHERE window_start < now() - interval '1 hour'; END IF;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.api_rate_hit(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.api_rate_hit(uuid) TO service_role;