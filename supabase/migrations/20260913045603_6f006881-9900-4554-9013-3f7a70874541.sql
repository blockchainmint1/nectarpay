
CREATE TYPE public.store_member_role AS ENUM ('viewer', 'manager', 'admin');

CREATE TABLE public.store_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.store_member_role NOT NULL DEFAULT 'viewer',
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, user_id)
);
CREATE INDEX store_members_user_idx ON public.store_members(user_id);
CREATE INDEX store_members_store_idx ON public.store_members(store_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_members TO authenticated;
GRANT ALL ON public.store_members TO service_role;
ALTER TABLE public.store_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.store_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  email text NOT NULL,
  role public.store_member_role NOT NULL DEFAULT 'viewer',
  token_hash text NOT NULL,
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  accepted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX store_invites_store_idx ON public.store_invites(store_id);
CREATE UNIQUE INDEX store_invites_token_idx ON public.store_invites(token_hash);

GRANT SELECT ON public.store_invites TO authenticated;
GRANT ALL ON public.store_invites TO service_role;
ALTER TABLE public.store_invites ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER store_members_set_updated_at BEFORE UPDATE ON public.store_members
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER store_invites_set_updated_at BEFORE UPDATE ON public.store_invites
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Access level of the caller for a store: 4 owner/platform admin, 3 admin member,
-- 2 manager, 1 viewer, 0 none.
CREATE OR REPLACE FUNCTION public.store_access_level(_store_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT 4 FROM public.stores s
      WHERE s.id = _store_id
        AND (s.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))),
    (SELECT CASE m.role WHEN 'admin' THEN 3 WHEN 'manager' THEN 2 ELSE 1 END
       FROM public.store_members m
      WHERE m.store_id = _store_id AND m.user_id = auth.uid()),
    0);
$$;

REVOKE EXECUTE ON FUNCTION public.store_access_level(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.store_access_level(uuid) TO authenticated, service_role;

-- store_members / store_invites policies
CREATE POLICY "Owners manage store members" ON public.store_members
  FOR ALL TO authenticated
  USING (public.owns_store(store_id))
  WITH CHECK (public.owns_store(store_id));

CREATE POLICY "Members see their own membership" ON public.store_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Owners view store invites" ON public.store_invites
  FOR SELECT TO authenticated
  USING (public.owns_store(store_id));

-- Team read access to the store record itself
CREATE POLICY "Team members view their stores" ON public.stores
  FOR SELECT TO authenticated
  USING (public.store_access_level(id) > 0);

-- Invoices: viewers read, managers write
CREATE POLICY "Team members view store invoices" ON public.invoices
  FOR SELECT TO authenticated
  USING (public.store_access_level(store_id) > 0);
CREATE POLICY "Managers create store invoices" ON public.invoices
  FOR INSERT TO authenticated
  WITH CHECK (public.store_access_level(store_id) >= 2);
CREATE POLICY "Managers update store invoices" ON public.invoices
  FOR UPDATE TO authenticated
  USING (public.store_access_level(store_id) >= 2)
  WITH CHECK (public.store_access_level(store_id) >= 2);

CREATE POLICY "Team members view store transactions" ON public.transactions
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.invoices i
    WHERE i.id = transactions.invoice_id AND public.store_access_level(i.store_id) > 0));

-- Wallet config: managers can look, only full-access members can change
CREATE POLICY "Managers view chain configs" ON public.chain_configs
  FOR SELECT TO authenticated
  USING (public.store_access_level(store_id) >= 2);
CREATE POLICY "Full access members manage chain configs" ON public.chain_configs
  FOR ALL TO authenticated
  USING (public.store_access_level(store_id) >= 3)
  WITH CHECK (public.store_access_level(store_id) >= 3);

CREATE POLICY "Managers view derived addresses" ON public.derived_addresses
  FOR SELECT TO authenticated
  USING (public.store_access_level(store_id) >= 2);

CREATE POLICY "Managers manage terminals" ON public.terminals
  FOR ALL TO authenticated
  USING (public.store_access_level(store_id) >= 2)
  WITH CHECK (public.store_access_level(store_id) >= 2);

CREATE POLICY "Managers manage pairing codes" ON public.terminal_pairing_codes
  FOR ALL TO authenticated
  USING (public.store_access_level(store_id) >= 2)
  WITH CHECK (public.store_access_level(store_id) >= 2);

CREATE POLICY "Managers manage public terminals" ON public.public_terminals
  FOR ALL TO authenticated
  USING (public.store_access_level(store_id) >= 2)
  WITH CHECK (public.store_access_level(store_id) >= 2);

CREATE POLICY "Full access members manage api keys" ON public.api_keys
  FOR ALL TO authenticated
  USING (public.store_access_level(store_id) >= 3)
  WITH CHECK (public.store_access_level(store_id) >= 3);
