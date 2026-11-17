CREATE OR REPLACE FUNCTION public.log_security_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor uuid := COALESCE(auth.uid(), NULLIF(current_setting('nectar.actor_id', true), '')::uuid);
BEGIN
  IF TG_TABLE_NAME = 'stores' THEN
    -- Alert when the callback link changes, or when the signing secret
    -- changes while a link exists. A secret created before any link is set
    -- can't send payment data anywhere, so it is not worth an alert.
    IF NEW.webhook_url IS DISTINCT FROM OLD.webhook_url
       OR (NEW.webhook_secret IS DISTINCT FROM OLD.webhook_secret AND NEW.webhook_url IS NOT NULL) THEN
      INSERT INTO public.security_events (kind, store_id, actor_id, detail)
      VALUES ('webhook_changed', NEW.id, actor, jsonb_build_object(
        'old_url', OLD.webhook_url, 'new_url', NEW.webhook_url,
        'secret_changed', NEW.webhook_secret IS DISTINCT FROM OLD.webhook_secret));
    END IF;
  ELSIF TG_TABLE_NAME = 'user_roles' THEN
    IF NEW.role = 'admin'::app_role AND (TG_OP = 'INSERT' OR OLD.role IS DISTINCT FROM NEW.role) THEN
      INSERT INTO public.security_events (kind, store_id, actor_id, detail)
      VALUES ('admin_granted', NULL, actor, jsonb_build_object('user_id', NEW.user_id));
    END IF;
  ELSIF TG_TABLE_NAME = 'store_members' THEN
    IF NEW.role = 'admin'::store_member_role AND (TG_OP = 'INSERT' OR OLD.role IS DISTINCT FROM NEW.role) THEN
      INSERT INTO public.security_events (kind, store_id, actor_id, detail)
      VALUES ('store_admin_added', NEW.store_id, actor, jsonb_build_object('user_id', NEW.user_id));
    END IF;
  ELSIF TG_TABLE_NAME = 'api_keys' THEN
    INSERT INTO public.security_events (kind, store_id, actor_id, detail)
    VALUES ('api_key_created', NEW.store_id, actor, jsonb_build_object('label', NEW.label, 'prefix', NEW.prefix));
  ELSIF TG_TABLE_NAME = 'terminals' THEN
    INSERT INTO public.security_events (kind, store_id, actor_id, detail)
    VALUES ('terminal_paired', NEW.store_id, actor, jsonb_build_object('label', NEW.label, 'device_model', NEW.device_model));
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.log_security_event() FROM PUBLIC, anon, authenticated;

-- Server-only: rotate a store's callback signing secret while recording who
-- asked, so the alert names the person instead of "an unknown".
CREATE OR REPLACE FUNCTION public.rotate_store_webhook_secret(_store_id uuid, _secret text, _actor uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('nectar.actor_id', _actor::text, true);
  UPDATE public.stores SET webhook_secret = _secret WHERE id = _store_id;
  PERFORM set_config('nectar.actor_id', '', true);
END $$;
REVOKE ALL ON FUNCTION public.rotate_store_webhook_secret(uuid, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rotate_store_webhook_secret(uuid, text, uuid) TO service_role;