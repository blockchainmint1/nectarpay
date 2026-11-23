CREATE OR REPLACE FUNCTION public.claim_address_index(_config_id uuid)
RETURNS integer
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.chain_configs
     SET next_address_index    = GREATEST(1, COALESCE(next_address_index, 0)) + 1,
         next_derivation_index = GREATEST(1, COALESCE(next_address_index, 0)) + 1
   WHERE id = _config_id
  RETURNING next_address_index - 1;
$$;

COMMENT ON FUNCTION public.claim_address_index(uuid) IS 'Atomically hands out the next rotating receive-address index (never 0) for a wallet and advances its counter, so two sales created at the same moment never get the same address.';

REVOKE ALL ON FUNCTION public.claim_address_index(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_address_index(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_address_index(uuid) TO service_role;