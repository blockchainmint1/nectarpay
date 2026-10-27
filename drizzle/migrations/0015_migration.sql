CREATE TABLE public.card_payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL,
  store_id uuid,
  terminal_id uuid,
  step text NOT NULL,
  http_status integer,
  status text,
  reason text,
  payment_id text,
  txid text,
  duration_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX card_payment_events_invoice ON public.card_payment_events(invoice_id, created_at);
CREATE INDEX card_payment_events_time ON public.card_payment_events(created_at DESC);
ALTER TABLE public.card_payment_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.card_payment_events FROM anon, authenticated;
GRANT ALL ON public.card_payment_events TO service_role;