CREATE OR REPLACE FUNCTION public.force_retired_chains_off()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Retired platform-wide (no real payment ever arrived). Saved wallet keys
  -- are kept; the network just can't be switched on.
  IF NEW.chain IN ('tron', 'sol', 'bch', 'dash') AND NEW.enabled THEN
    NEW.enabled := false;
  END IF;
  RETURN NEW;
END
$$;

UPDATE public.chain_configs SET enabled = false WHERE chain IN ('bch', 'dash') AND enabled;