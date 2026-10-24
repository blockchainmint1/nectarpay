CREATE TABLE public.customer_marketing_consents (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
 invoice_id uuid NOT NULL REFERENCES public.invoices(id),
 email text NOT NULL,
 source text NOT NULL,
 consent_text text NOT NULL,
 consented_at timestamptz NOT NULL DEFAULT now(),
 revoked_at timestamptz,
 UNIQUE (store_id, email),
 CONSTRAINT customer_consent_email_length CHECK (length(email) <= 254),
 CONSTRAINT customer_consent_source CHECK (source IN ('pos', 'checkout'))
);
GRANT SELECT ON public.customer_marketing_consents TO authenticated;
GRANT ALL ON public.customer_marketing_consents TO service_role;
ALTER TABLE public.customer_marketing_consents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Store members read customer consent" ON public.customer_marketing_consents FOR SELECT TO authenticated USING (public.store_access_level(store_id) >= 10);
CREATE INDEX customer_marketing_consents_store_idx ON public.customer_marketing_consents(store_id);