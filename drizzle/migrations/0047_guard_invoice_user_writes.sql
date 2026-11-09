-- Merchants (signed-in browser/API sessions) may only create PENDING sales and,
-- afterwards, resend/extend them or cancel unpaid ones. Payment status and
-- payment details are set only by the server (service role).
CREATE OR REPLACE FUNCTION public.guard_invoice_user_writes()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  allowed text[] := ARRAY['email_sent_at','email_send_count','expires_at','buyer_email','customer_email','status','updated_at'];
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status IS DISTINCT FROM 'pending'::invoice_status
       OR NEW.address IS NOT NULL OR NEW.crypto_amount IS NOT NULL OR NEW.rate IS NOT NULL
       OR NEW.derivation_index IS NOT NULL OR NEW.address_index IS NOT NULL
       OR NEW.payment_program IS NOT NULL OR NEW.discount_usd IS NOT NULL OR NEW.discount_pct IS NOT NULL
       OR NEW.signature_path IS NOT NULL OR NEW.signature_data_url IS NOT NULL
       OR NEW.first_viewed_at IS NOT NULL OR NEW.last_viewed_at IS NOT NULL THEN
      RAISE EXCEPTION 'New sales must start unpaid; payment details are set by NectarPay.'
        USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  IF (to_jsonb(NEW) - allowed) IS DISTINCT FROM (to_jsonb(OLD) - allowed) THEN
    RAISE EXCEPTION 'Only the email, expiry and cancel options of a sale can be changed.'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status <> 'cancelled'::invoice_status
       OR OLD.status IN ('confirmed'::invoice_status, 'overpaid'::invoice_status, 'detected'::invoice_status) THEN
      RAISE EXCEPTION 'A sale can only be cancelled while unpaid; payment status is set by NectarPay.'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_invoice_user_writes() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER a_guard_invoice_user_writes
  BEFORE INSERT OR UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.guard_invoice_user_writes();