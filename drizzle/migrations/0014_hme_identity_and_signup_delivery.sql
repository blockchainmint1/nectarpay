CREATE TABLE public.hme_member_links (
  user_id uuid PRIMARY KEY,
  member_id uuid NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.hme_member_links TO authenticated;
GRANT ALL ON public.hme_member_links TO service_role;
ALTER TABLE public.hme_member_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own HME identity" ON public.hme_member_links FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE TABLE public.hme_signup_events (
  user_id uuid PRIMARY KEY,
  ref text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.hme_signup_events TO service_role;
ALTER TABLE public.hme_signup_events ENABLE ROW LEVEL SECURITY;