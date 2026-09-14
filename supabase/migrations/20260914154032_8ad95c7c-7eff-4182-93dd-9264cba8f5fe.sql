CREATE TABLE public.demo_account_resets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  used_at timestamptz,
  deleted_summary jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX demo_account_resets_user_idx ON public.demo_account_resets (user_id);

GRANT ALL ON public.demo_account_resets TO service_role;

ALTER TABLE public.demo_account_resets ENABLE ROW LEVEL SECURITY;