ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_redirect_url_http_only
  CHECK (redirect_url IS NULL OR redirect_url ~* '^https?://[^[:space:]]+$') NOT VALID;
COMMENT ON CONSTRAINT invoices_redirect_url_http_only ON public.invoices IS 'Shopper return links must be plain http(s) web links; javascript:/data: links ran code on the checkout origin.';