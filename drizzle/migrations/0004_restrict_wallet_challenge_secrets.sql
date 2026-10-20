REVOKE ALL PRIVILEGES ON TABLE public.wallet_login_challenges FROM PUBLIC, anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE public.wallet_login_challenges TO service_role;