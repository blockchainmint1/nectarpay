-- N1: Tangem USDC payout address behind a 4-hour hold
ALTER TABLE public.stores
  ADD COLUMN pending_usdc_payout_address_eth text,
  ADD COLUMN pending_usdc_payout_requested_at timestamptz,
  ADD COLUMN pending_usdc_payout_activates_at timestamptz;

REVOKE UPDATE (usdc_payout_address_eth), INSERT (usdc_payout_address_eth) ON public.stores FROM authenticated, anon;
GRANT SELECT (pending_usdc_payout_address_eth, pending_usdc_payout_activates_at) ON public.stores TO authenticated;

CREATE OR REPLACE FUNCTION public.store_payout_cooloff()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_addr text := nullif(btrim(NEW.usdc_payout_address_eth), '');
  old_addr text := nullif(btrim(OLD.usdc_payout_address_eth), '');
BEGIN
  IF coalesce(current_setting('nectar.key_promotion', true), '') = 'on' THEN
    RETURN NEW;
  END IF;
  IF new_addr IS NOT DISTINCT FROM old_addr THEN
    RETURN NEW;
  END IF;

  IF new_addr IS NULL THEN
    -- Clearing sends money nowhere new: immediate, and drops any pending change.
    NEW.usdc_payout_address_eth := NULL;
    NEW.pending_usdc_payout_address_eth := NULL;
    NEW.pending_usdc_payout_requested_at := NULL;
    NEW.pending_usdc_payout_activates_at := NULL;
    INSERT INTO public.security_events (kind, store_id, actor_id, detail)
    VALUES ('payout_address_changed', NEW.id, auth.uid(),
            jsonb_build_object('old_address', old_addr, 'new_address', NULL, 'scheduled', false));
    RETURN NEW;
  END IF;

  NEW.pending_usdc_payout_address_eth := new_addr;
  NEW.pending_usdc_payout_requested_at := now();
  NEW.pending_usdc_payout_activates_at := now() + interval '4 hours';
  NEW.usdc_payout_address_eth := OLD.usdc_payout_address_eth;
  INSERT INTO public.security_events (kind, store_id, actor_id, detail)
  VALUES ('payout_address_changed', NEW.id, auth.uid(),
          jsonb_build_object('old_address', old_addr, 'new_address', new_addr, 'scheduled', true,
                             'activates_at', NEW.pending_usdc_payout_activates_at));
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.store_payout_cooloff() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER a_store_payout_cooloff
  BEFORE UPDATE OF usdc_payout_address_eth ON public.stores
  FOR EACH ROW EXECUTE FUNCTION public.store_payout_cooloff();

-- New stores never start with a payout address from the browser (grant revoked);
-- server inserts are allowed as-is.

CREATE OR REPLACE FUNCTION public.promote_due_chain_keys()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n integer;
  m integer;
BEGIN
  PERFORM set_config('nectar.key_promotion', 'on', true);
  UPDATE public.chain_configs
     SET xpub = pending_xpub,
         xpub_or_address = coalesce(pending_xpub_or_address, ''),
         pending_xpub = NULL,
         pending_xpub_or_address = NULL,
         pending_requested_at = NULL,
         pending_activates_at = NULL
   WHERE pending_activates_at IS NOT NULL
     AND pending_activates_at <= now();
  GET DIAGNOSTICS n = ROW_COUNT;
  UPDATE public.stores
     SET usdc_payout_address_eth = pending_usdc_payout_address_eth,
         pending_usdc_payout_address_eth = NULL,
         pending_usdc_payout_requested_at = NULL,
         pending_usdc_payout_activates_at = NULL
   WHERE pending_usdc_payout_activates_at IS NOT NULL
     AND pending_usdc_payout_activates_at <= now();
  GET DIAGNOSTICS m = ROW_COUNT;
  PERFORM set_config('nectar.key_promotion', 'off', true);
  RETURN n + m;
END $$;
REVOKE ALL ON FUNCTION public.promote_due_chain_keys() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.promote_due_chain_keys() TO service_role;

-- N3: first key on a coin is immediate only while the store is brand new
CREATE OR REPLACE FUNCTION public.chain_key_cooloff()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_key text;
  new_key text;
  had_key boolean;
  established boolean;
  same_wallet boolean;
BEGIN
  IF coalesce(current_setting('nectar.key_promotion', true), '') = 'on' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF EXISTS (SELECT 1 FROM public.chain_configs c WHERE c.store_id = NEW.store_id AND c.chain = NEW.chain) THEN
      RETURN NEW;
    END IF;
  ELSE
    IF NEW.xpub IS NOT DISTINCT FROM OLD.xpub
       AND NEW.xpub_or_address IS NOT DISTINCT FROM OLD.xpub_or_address THEN
      RETURN NEW;
    END IF;
    old_key := coalesce(nullif(btrim(OLD.xpub), ''), nullif(btrim(OLD.xpub_or_address), ''));
  END IF;

  new_key := coalesce(nullif(btrim(NEW.xpub), ''), nullif(btrim(NEW.xpub_or_address), ''));

  IF new_key IS NULL THEN
    NEW.pending_xpub := NULL;
    NEW.pending_xpub_or_address := NULL;
    NEW.pending_requested_at := NULL;
    NEW.pending_activates_at := NULL;
    RETURN NEW;
  END IF;

  IF old_key IS NOT NULL AND new_key = old_key THEN
    RETURN NEW;
  END IF;

  IF old_key IS NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.chain_config_audit a
       WHERE a.store_id = NEW.store_id AND a.chain = NEW.chain
         AND a.action IN ('insert', 'update')
         AND coalesce(nullif(btrim(a.new_xpub), ''), nullif(btrim(a.new_xpub_or_address), '')) IS NOT NULL
    ) INTO had_key;

    -- The same wallet this store already pays into on another coin (e.g. ZCU
    -- reusing the ETH xpub) sends money nowhere new.
    SELECT EXISTS (
      SELECT 1 FROM public.chain_configs c
       WHERE c.store_id = NEW.store_id AND c.chain <> NEW.chain
         AND coalesce(nullif(btrim(c.xpub), ''), nullif(btrim(c.xpub_or_address), '')) = new_key
    ) INTO same_wallet;

    -- Established store: another coin has had a live key for over 15 minutes
    -- (or predates the change log). Brand-new stores set up freely.
    SELECT EXISTS (
      SELECT 1 FROM public.chain_configs c
       WHERE c.store_id = NEW.store_id AND c.chain <> NEW.chain
         AND coalesce(nullif(btrim(c.xpub), ''), nullif(btrim(c.xpub_or_address), '')) IS NOT NULL
         AND (
           NOT EXISTS (SELECT 1 FROM public.chain_config_audit a WHERE a.store_id = c.store_id AND a.chain = c.chain)
           OR EXISTS (
             SELECT 1 FROM public.chain_config_audit a
              WHERE a.store_id = c.store_id AND a.chain = c.chain
                AND a.action IN ('insert', 'update')
                AND coalesce(nullif(btrim(a.new_xpub), ''), nullif(btrim(a.new_xpub_or_address), '')) IS NOT NULL
                AND a.created_at < now() - interval '15 minutes')
         )
    ) INTO established;

    IF same_wallet OR (NOT had_key AND NOT established) THEN
      RETURN NEW;
    END IF;
  END IF;

  NEW.pending_xpub := NEW.xpub;
  NEW.pending_xpub_or_address := NEW.xpub_or_address;
  NEW.pending_requested_at := now();
  NEW.pending_activates_at := now() + interval '4 hours';
  IF TG_OP = 'UPDATE' THEN
    NEW.xpub := OLD.xpub;
    NEW.xpub_or_address := OLD.xpub_or_address;
  ELSE
    NEW.xpub := NULL;
    NEW.xpub_or_address := '';
  END IF;

  INSERT INTO public.chain_config_audit
    (store_id, chain, action, old_xpub, new_xpub, old_xpub_or_address, new_xpub_or_address, source)
  VALUES
    (NEW.store_id, NEW.chain, 'scheduled',
     CASE WHEN TG_OP = 'UPDATE' THEN OLD.xpub END, NEW.pending_xpub,
     CASE WHEN TG_OP = 'UPDATE' THEN OLD.xpub_or_address END, NEW.pending_xpub_or_address,
     'cooloff');
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.chain_key_cooloff() FROM PUBLIC, anon, authenticated;

-- M6: admin-only store fields
CREATE OR REPLACE FUNCTION public.guard_store_admin_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;
  IF public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.owner_id IS DISTINCT FROM OLD.owner_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR NEW.admin_market IS DISTINCT FROM OLD.admin_market
     OR NEW.admin_rep IS DISTINCT FROM OLD.admin_rep
     OR NEW.admin_notes IS DISTINCT FROM OLD.admin_notes
     OR (OLD.deactivated_at IS NOT NULL AND NEW.deactivated_at IS DISTINCT FROM OLD.deactivated_at) THEN
    RAISE EXCEPTION 'Only NectarPay staff can change that store setting.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_store_admin_columns() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER a_guard_store_admin_columns
  BEFORE UPDATE ON public.stores
  FOR EACH ROW EXECUTE FUNCTION public.guard_store_admin_columns();