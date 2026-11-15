CREATE OR REPLACE FUNCTION public.guard_store_admin_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;
  IF public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.owner_id IS DISTINCT FROM OLD.owner_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR NEW.admin_market IS DISTINCT FROM OLD.admin_market
     OR NEW.admin_rep IS DISTINCT FROM OLD.admin_rep
     OR NEW.admin_notes IS DISTINCT FROM OLD.admin_notes
     OR (OLD.deactivated_at IS NOT NULL AND NEW.deactivated_at IS DISTINCT FROM OLD.deactivated_at) THEN
    RAISE EXCEPTION 'Only NectarPay staff can change that store setting.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_store_admin_columns() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.guard_store_admin_columns() TO authenticated;