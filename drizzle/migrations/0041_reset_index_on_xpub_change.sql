CREATE OR REPLACE FUNCTION public.reset_address_index_on_xpub_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF coalesce(NEW.xpub, NEW.xpub_or_address) IS DISTINCT FROM coalesce(OLD.xpub, OLD.xpub_or_address)
     AND coalesce(NEW.xpub, NEW.xpub_or_address) IS NOT NULL
     -- never restart a wallet this store used before (would reuse its addresses)
     AND NOT EXISTS (
       SELECT 1 FROM public.chain_config_audit a
       WHERE a.store_id = NEW.store_id AND a.chain = NEW.chain
         AND coalesce(a.old_xpub, a.old_xpub_or_address) = coalesce(NEW.xpub, NEW.xpub_or_address))
  THEN
    -- 0 means the first sale uses address #1; #0 stays the wallet's main address
    NEW.next_address_index := 0;
    NEW.next_derivation_index := 0;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_reset_address_index_on_xpub_change ON public.chain_configs;
CREATE TRIGGER trg_reset_address_index_on_xpub_change
BEFORE UPDATE OF xpub, xpub_or_address ON public.chain_configs
FOR EACH ROW EXECUTE FUNCTION public.reset_address_index_on_xpub_change();