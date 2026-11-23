ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS late_checked_at timestamptz;
CREATE INDEX IF NOT EXISTS invoices_late_check_due_idx
  ON public.invoices (expires_at)
  WHERE status = 'expired' AND late_checked_at IS NULL;