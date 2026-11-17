ALTER TABLE public.webhook_deliveries ALTER COLUMN signature DROP NOT NULL;
ALTER TABLE public.webhook_deliveries ALTER COLUMN attempt SET DEFAULT 0;
ALTER TABLE public.webhook_deliveries ADD COLUMN IF NOT EXISTS store_id uuid;
ALTER TABLE public.webhook_deliveries ADD COLUMN IF NOT EXISTS event_type text;

CREATE INDEX IF NOT EXISTS webhook_deliveries_due_idx
  ON public.webhook_deliveries (next_retry_at)
  WHERE delivered_at IS NULL AND next_retry_at IS NOT NULL;

CREATE OR REPLACE FUNCTION public.enqueue_invoice_webhooks()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  hook_url text;
  hook_secret text;
  types text[];
  t text;
  n int := 0;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status
     OR NEW.status NOT IN ('confirmed', 'overpaid', 'underpaid') THEN
    RETURN NEW;
  END IF;

  SELECT s.webhook_url, s.webhook_secret INTO hook_url, hook_secret
    FROM public.stores s WHERE s.id = NEW.store_id;
  IF coalesce(btrim(hook_url), '') = '' OR coalesce(btrim(hook_secret), '') = '' THEN
    RETURN NEW;
  END IF;

  types := CASE NEW.status
    WHEN 'underpaid' THEN ARRAY['invoice.underpaid']
    WHEN 'overpaid' THEN ARRAY['invoice.overpaid', 'invoice.confirmed']
    ELSE ARRAY['invoice.paid', 'invoice.confirmed']
  END;

  FOREACH t IN ARRAY types LOOP
    INSERT INTO public.webhook_deliveries
      (invoice_id, store_id, url, event_type, payload, attempt, next_retry_at, created_at)
    VALUES (
      NEW.id, NEW.store_id, hook_url, t,
      jsonb_build_object(
        'id', gen_random_uuid(),
        'type', t,
        'created_at', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
        'data', jsonb_build_object(
          'invoice_id', NEW.id,
          'store_id', NEW.store_id,
          'status', NEW.status,
          'chain', coalesce(NEW.chain::text, ''),
          'address', NEW.address,
          'fiat_amount', NEW.fiat_amount,
          'fiat_currency', NEW.fiat_currency,
          'paid_amount_usd', NULL,
          'order_id', NEW.external_order_id
        )
      ),
      0,
      now(),
      now() + make_interval(secs => n * 0.001)
    );
    n := n + 1;
  END LOOP;
  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.enqueue_invoice_webhooks() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS invoices_enqueue_webhooks ON public.invoices;
CREATE TRIGGER invoices_enqueue_webhooks
  AFTER UPDATE OF status ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_invoice_webhooks();