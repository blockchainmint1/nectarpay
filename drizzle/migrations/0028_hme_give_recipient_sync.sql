ALTER TABLE public.egiving_recipients ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual';
ALTER TABLE public.egiving_recipients ADD COLUMN IF NOT EXISTS blocked boolean NOT NULL DEFAULT false;
ALTER TABLE public.egiving_recipients ADD COLUMN IF NOT EXISTS synced_at timestamptz;

CREATE TABLE public.hme_give_sync (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  last_issued_at timestamptz,
  last_synced_at timestamptz,
  last_attempt_at timestamptz,
  last_error text,
  recipient_count int NOT NULL DEFAULT 0,
  backup jsonb
);
GRANT SELECT ON public.hme_give_sync TO authenticated;
GRANT ALL ON public.hme_give_sync TO service_role;
ALTER TABLE public.hme_give_sync ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read HME Give sync" ON public.hme_give_sync FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
INSERT INTO public.hme_give_sync (id) VALUES (1) ON CONFLICT DO NOTHING;