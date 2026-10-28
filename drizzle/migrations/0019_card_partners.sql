CREATE TABLE public.card_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  pay_url text NOT NULL CHECK (pay_url ~ '^https://'),
  card_domains text[] NOT NULL DEFAULT '{}',
  secret text,
  secret_fingerprint text,
  uses_legacy_secret boolean NOT NULL DEFAULT false,
  is_default boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX card_partners_one_default ON public.card_partners (is_default) WHERE is_default;
GRANT SELECT (id, name, pay_url, card_domains, secret_fingerprint, uses_legacy_secret, is_default, active, created_at, updated_at) ON public.card_partners TO authenticated;
GRANT INSERT (name, pay_url, card_domains, is_default, active) ON public.card_partners TO authenticated;
GRANT UPDATE (name, pay_url, card_domains, is_default, active, updated_at) ON public.card_partners TO authenticated;
GRANT ALL ON public.card_partners TO service_role;
ALTER TABLE public.card_partners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage card partners" ON public.card_partners FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER card_partners_updated_at BEFORE UPDATE ON public.card_partners FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
ALTER TABLE public.card_payment_events ADD COLUMN partner_id uuid;
INSERT INTO public.card_partners (name, pay_url, card_domains, uses_legacy_secret, is_default)
VALUES ('CryptoPOP', 'https://app.cryptopop.org/api/public/card/pay', ARRAY['cryptopop.org'], true, true);