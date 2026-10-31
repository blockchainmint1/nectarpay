ALTER TABLE public.telegram_bind_codes ADD COLUMN IF NOT EXISTS store_id uuid;
ALTER TABLE public.fast_enrollments ADD COLUMN IF NOT EXISTS welcome_sent_at timestamptz;
ALTER TABLE public.fast_enrollments ADD COLUMN IF NOT EXISTS welcome_error text;