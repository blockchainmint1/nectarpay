ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deactivated_at timestamptz,
  ADD COLUMN IF NOT EXISTS deactivated_by uuid,
  ADD COLUMN IF NOT EXISTS deactivated_reason text;

ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS deactivated_at timestamptz;

CREATE TABLE IF NOT EXISTS public.account_deactivations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('deactivate','reactivate')),
  reason text,
  performed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.account_deactivations TO authenticated;
GRANT ALL ON public.account_deactivations TO service_role;

ALTER TABLE public.account_deactivations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view deactivation history"
  ON public.account_deactivations FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER account_deactivations_set_updated_at
  BEFORE UPDATE ON public.account_deactivations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS account_deactivations_user_id_idx ON public.account_deactivations(user_id);
CREATE INDEX IF NOT EXISTS profiles_deactivated_at_idx ON public.profiles(deactivated_at);