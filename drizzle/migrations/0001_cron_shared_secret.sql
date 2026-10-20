CREATE TABLE public.cron_secret (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  secret text NOT NULL DEFAULT encode(extensions.gen_random_bytes(32), 'hex'),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.cron_secret TO service_role;
REVOKE ALL ON public.cron_secret FROM anon, authenticated;
ALTER TABLE public.cron_secret ENABLE ROW LEVEL SECURITY;
INSERT INTO public.cron_secret (id) VALUES (1) ON CONFLICT DO NOTHING;