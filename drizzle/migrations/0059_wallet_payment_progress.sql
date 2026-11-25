ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS wallet_event text CHECK (wallet_event IS NULL OR wallet_event IN ('paying', 'payment_submitted')),
  ADD COLUMN IF NOT EXISTS wallet_event_at timestamptz,
  ADD COLUMN IF NOT EXISTS wallet_partner_name text,
  ADD COLUMN IF NOT EXISTS wallet_txid text,
  ADD COLUMN IF NOT EXISTS wallet_submitted_at timestamptz;

CREATE TABLE public.payment_progress_notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.card_partners(id) ON DELETE CASCADE,
  request_id uuid NOT NULL,
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  event text NOT NULL CHECK (event IN ('paying', 'payment_submitted')),
  txid text,
  received_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (partner_id, request_id)
);

CREATE INDEX idx_payment_progress_notices_invoice
  ON public.payment_progress_notices (invoice_id, received_at DESC);

GRANT SELECT ON public.payment_progress_notices TO authenticated;
GRANT ALL ON public.payment_progress_notices TO service_role;

ALTER TABLE public.payment_progress_notices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view payment progress notices"
  ON public.payment_progress_notices
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

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
       OR NEW.first_viewed_at IS NOT NULL OR NEW.last_viewed_at IS NOT NULL
       OR NEW.wallet_event IS NOT NULL OR NEW.wallet_event_at IS NOT NULL
       OR NEW.wallet_partner_name IS NOT NULL OR NEW.wallet_txid IS NOT NULL
       OR NEW.wallet_submitted_at IS NOT NULL THEN
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