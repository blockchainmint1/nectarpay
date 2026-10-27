ALTER TABLE public.wallet_login_challenges ADD COLUMN IF NOT EXISTS signable_message text;
ALTER TABLE public.wallet_login_challenges ADD COLUMN IF NOT EXISTS browser_binding_hash text;
COMMENT ON COLUMN public.wallet_login_challenges.signable_message IS 'Exact server-issued sign-in message; callbacks must verify only these bytes.';
COMMENT ON COLUMN public.wallet_login_challenges.browser_binding_hash IS 'SHA256 of the initiating browser HttpOnly cookie; never included in wallet QR or responses.';