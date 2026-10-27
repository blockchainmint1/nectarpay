CREATE TABLE public.sensitive_action_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
  action text NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX sensitive_action_codes_lookup_idx
  ON public.sensitive_action_codes (user_id, action, created_at DESC);

GRANT ALL ON public.sensitive_action_codes TO service_role;

ALTER TABLE public.sensitive_action_codes ENABLE ROW LEVEL SECURITY;
-- No policies: this table is only ever read/written by trusted server code.