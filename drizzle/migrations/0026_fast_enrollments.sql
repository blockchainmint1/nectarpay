CREATE TABLE public.fast_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coin_id text NOT NULL CHECK (coin_id ~ '^[0-9A-Za-z]{6}$'),
  tsd_address text NOT NULL,
  business_name text NOT NULL CHECK (char_length(business_name) BETWEEN 1 AND 120),
  contact_name text NOT NULL CHECK (char_length(contact_name) BETWEEN 1 AND 120),
  email text NOT NULL CHECK (char_length(email) <= 255),
  phone text CHECK (char_length(phone) <= 40),
  category text CHECK (char_length(category) <= 80),
  street text CHECK (char_length(street) <= 200),
  city text CHECK (char_length(city) <= 120),
  region text CHECK (char_length(region) <= 120),
  postal_code text CHECK (char_length(postal_code) <= 20),
  country text CHECK (char_length(country) <= 120),
  egiving_opt_in boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','activated','cancelled')),
  enrolled_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX fast_enrollments_coin_id_key ON public.fast_enrollments (coin_id);
CREATE UNIQUE INDEX fast_enrollments_tsd_address_key ON public.fast_enrollments (tsd_address);
GRANT SELECT ON public.fast_enrollments TO authenticated;
GRANT ALL ON public.fast_enrollments TO service_role;
ALTER TABLE public.fast_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read fast enrollments" ON public.fast_enrollments FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));