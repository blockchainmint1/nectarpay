CREATE TABLE public.store_notification_prefs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  email_enabled boolean NOT NULL DEFAULT false,
  email_address text,
  telegram_enabled boolean NOT NULL DEFAULT false,
  telegram_chat_id text,
  events jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_notification_prefs TO authenticated;
GRANT ALL ON public.store_notification_prefs TO service_role;

ALTER TABLE public.store_notification_prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own store notification prefs"
ON public.store_notification_prefs
FOR ALL
TO authenticated
USING (user_id = auth.uid() AND public.store_access_level(store_id) >= 3)
WITH CHECK (user_id = auth.uid() AND public.store_access_level(store_id) >= 3);

CREATE TRIGGER store_notification_prefs_set_updated_at
BEFORE UPDATE ON public.store_notification_prefs
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_store_notification_prefs_store ON public.store_notification_prefs(store_id);