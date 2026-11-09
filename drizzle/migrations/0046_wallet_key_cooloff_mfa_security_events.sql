-- 1) Scheduled (cooling-off) wallet keys
ALTER TABLE public.chain_configs
  ADD COLUMN pending_xpub text,
  ADD COLUMN pending_xpub_or_address text,
  ADD COLUMN pending_requested_at timestamptz,
  ADD COLUMN pending_activates_at timestamptz;

ALTER TABLE public.chain_config_audit DROP CONSTRAINT chain_config_audit_action_check;
ALTER TABLE public.chain_config_audit ADD CONSTRAINT chain_config_audit_action_check
  CHECK (action = ANY (ARRAY['insert'::text, 'update'::text, 'scheduled'::text, 'cancelled'::text]));

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
BEGIN
  IF coalesce(current_setting('nectar.key_promotion', true), '') = 'on' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- Upserts onto an existing row are handled by the UPDATE pass.
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

  -- Clearing a key sends money nowhere new: immediate, and drops any pending change.
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

  -- The very first key on this coin for this store is immediate.
  SELECT EXISTS (
    SELECT 1 FROM public.chain_config_audit a
     WHERE a.store_id = NEW.store_id AND a.chain = NEW.chain
       AND a.action IN ('insert', 'update')
       AND coalesce(nullif(btrim(a.new_xpub), ''), nullif(btrim(a.new_xpub_or_address), '')) IS NOT NULL
  ) INTO had_key;
  IF old_key IS NULL AND NOT had_key THEN
    RETURN NEW;
  END IF;

  -- Replacement: keep paying the current key, schedule the new one for 4 hours.
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

CREATE TRIGGER a_chain_key_cooloff
  BEFORE INSERT OR UPDATE ON public.chain_configs
  FOR EACH ROW EXECUTE FUNCTION public.chain_key_cooloff();

CREATE OR REPLACE FUNCTION public.chain_configs_audit_xpub()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  src text := CASE WHEN coalesce(current_setting('nectar.key_promotion', true), '') = 'on'
                   THEN 'scheduled_change_activated' END;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.xpub IS NOT NULL OR NEW.xpub_or_address IS NOT NULL THEN
      INSERT INTO public.chain_config_audit
        (store_id, chain, action, old_xpub, new_xpub, old_xpub_or_address, new_xpub_or_address, source)
      VALUES
        (NEW.store_id, NEW.chain, 'insert', NULL, NEW.xpub, NULL, NEW.xpub_or_address, src);
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.xpub IS DISTINCT FROM OLD.xpub
       OR NEW.xpub_or_address IS DISTINCT FROM OLD.xpub_or_address THEN
      INSERT INTO public.chain_config_audit
        (store_id, chain, action, old_xpub, new_xpub, old_xpub_or_address, new_xpub_or_address, source)
      VALUES
        (NEW.store_id, NEW.chain, 'update', OLD.xpub, NEW.xpub, OLD.xpub_or_address, NEW.xpub_or_address, src);
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.promote_due_chain_keys()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n integer;
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
  PERFORM set_config('nectar.key_promotion', 'off', true);
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.promote_due_chain_keys() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.promote_due_chain_keys() TO service_role;

-- 2) Browser sessions may toggle coins but never write wallet keys directly.
REVOKE INSERT, UPDATE, DELETE ON public.chain_configs FROM authenticated, anon;
GRANT UPDATE (enabled, stables, display_order, qr_address_only) ON public.chain_configs TO authenticated;

-- 3) Server-side 2-step login: users who turned it on must have passed it.
CREATE OR REPLACE FUNCTION public.mfa_ok()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
      OR NOT EXISTS (
        SELECT 1 FROM auth.mfa_factors f
         WHERE f.user_id = auth.uid() AND f.status = 'verified'
      );
$$;
REVOKE ALL ON FUNCTION public.mfa_ok() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mfa_ok() TO authenticated, service_role;

CREATE POLICY "Two-step login required (update)" ON public.chain_configs AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.mfa_ok()) WITH CHECK (public.mfa_ok());
CREATE POLICY "Two-step login required (update)" ON public.stores AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.mfa_ok()) WITH CHECK (public.mfa_ok());
CREATE POLICY "Two-step login required (insert)" ON public.stores AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.mfa_ok());
CREATE POLICY "Two-step login required (delete)" ON public.stores AS RESTRICTIVE FOR DELETE TO authenticated USING (public.mfa_ok());
CREATE POLICY "Two-step login required (update)" ON public.api_keys AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.mfa_ok()) WITH CHECK (public.mfa_ok());
CREATE POLICY "Two-step login required (insert)" ON public.api_keys AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.mfa_ok());
CREATE POLICY "Two-step login required (delete)" ON public.api_keys AS RESTRICTIVE FOR DELETE TO authenticated USING (public.mfa_ok());
CREATE POLICY "Two-step login required (update)" ON public.store_members AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.mfa_ok()) WITH CHECK (public.mfa_ok());
CREATE POLICY "Two-step login required (insert)" ON public.store_members AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.mfa_ok());
CREATE POLICY "Two-step login required (delete)" ON public.store_members AS RESTRICTIVE FOR DELETE TO authenticated USING (public.mfa_ok());

-- 4) Risky-change log for admin alerts
CREATE TABLE public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  store_id uuid,
  actor_id uuid,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX security_events_pending_idx ON public.security_events (created_at) WHERE notified_at IS NULL;
GRANT SELECT ON public.security_events TO authenticated;
GRANT ALL ON public.security_events TO service_role;
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read security events" ON public.security_events
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.log_security_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_TABLE_NAME = 'stores' THEN
    IF NEW.webhook_url IS DISTINCT FROM OLD.webhook_url
       OR NEW.webhook_secret IS DISTINCT FROM OLD.webhook_secret THEN
      INSERT INTO public.security_events (kind, store_id, actor_id, detail)
      VALUES ('webhook_changed', NEW.id, auth.uid(), jsonb_build_object(
        'old_url', OLD.webhook_url, 'new_url', NEW.webhook_url,
        'secret_changed', NEW.webhook_secret IS DISTINCT FROM OLD.webhook_secret));
    END IF;
  ELSIF TG_TABLE_NAME = 'user_roles' THEN
    IF NEW.role = 'admin'::app_role AND (TG_OP = 'INSERT' OR OLD.role IS DISTINCT FROM NEW.role) THEN
      INSERT INTO public.security_events (kind, store_id, actor_id, detail)
      VALUES ('admin_granted', NULL, auth.uid(), jsonb_build_object('user_id', NEW.user_id));
    END IF;
  ELSIF TG_TABLE_NAME = 'store_members' THEN
    IF NEW.role = 'admin'::store_member_role AND (TG_OP = 'INSERT' OR OLD.role IS DISTINCT FROM NEW.role) THEN
      INSERT INTO public.security_events (kind, store_id, actor_id, detail)
      VALUES ('store_admin_added', NEW.store_id, auth.uid(), jsonb_build_object('user_id', NEW.user_id));
    END IF;
  ELSIF TG_TABLE_NAME = 'api_keys' THEN
    INSERT INTO public.security_events (kind, store_id, actor_id, detail)
    VALUES ('api_key_created', NEW.store_id, auth.uid(), jsonb_build_object('label', NEW.label, 'prefix', NEW.prefix));
  ELSIF TG_TABLE_NAME = 'terminals' THEN
    INSERT INTO public.security_events (kind, store_id, actor_id, detail)
    VALUES ('terminal_paired', NEW.store_id, auth.uid(), jsonb_build_object('label', NEW.label, 'device_model', NEW.device_model));
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.log_security_event() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER security_event_webhook AFTER UPDATE OF webhook_url, webhook_secret ON public.stores
  FOR EACH ROW EXECUTE FUNCTION public.log_security_event();
CREATE TRIGGER security_event_admin_role AFTER INSERT OR UPDATE OF role ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.log_security_event();
CREATE TRIGGER security_event_store_admin AFTER INSERT OR UPDATE OF role ON public.store_members
  FOR EACH ROW EXECUTE FUNCTION public.log_security_event();
CREATE TRIGGER security_event_api_key AFTER INSERT ON public.api_keys
  FOR EACH ROW EXECUTE FUNCTION public.log_security_event();
CREATE TRIGGER security_event_terminal AFTER INSERT ON public.terminals
  FOR EACH ROW EXECUTE FUNCTION public.log_security_event();