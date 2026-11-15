CREATE OR REPLACE FUNCTION public.force_retired_chains_off()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Tron and Solana are retired platform-wide (no real payment ever arrived).
  -- Saved wallet keys are kept; the network just can't be switched on.
  IF NEW.chain IN ('tron', 'sol') AND NEW.enabled THEN
    NEW.enabled := false;
  END IF;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS chain_configs_force_retired_off ON public.chain_configs;
CREATE TRIGGER chain_configs_force_retired_off
BEFORE INSERT OR UPDATE ON public.chain_configs
FOR EACH ROW EXECUTE FUNCTION public.force_retired_chains_off();

UPDATE public.chain_configs SET enabled = false WHERE chain IN ('tron', 'sol') AND enabled;