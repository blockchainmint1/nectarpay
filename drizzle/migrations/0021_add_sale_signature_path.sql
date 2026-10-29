-- Customer signatures become real image files in the private sale-signatures bucket.
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS signature_path text;

COMMENT ON COLUMN public.invoices.signature_path IS 'Object path of the captured customer signature image in the private sale-signatures bucket; served to the store team through short-lived signed URLs only.';
COMMENT ON COLUMN public.invoices.signature_data_url IS 'Fallback inline copy of the signature image, written only when the file could not be stored at signature_path.';
