CREATE TABLE public.egiving_recipients (
  address text PRIMARY KEY,
  kind text NOT NULL CHECK (kind IN ('church','program')),
  name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.egiving_recipients TO authenticated;
GRANT ALL ON public.egiving_recipients TO service_role;
ALTER TABLE public.egiving_recipients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage eGiving recipients" ON public.egiving_recipients
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));