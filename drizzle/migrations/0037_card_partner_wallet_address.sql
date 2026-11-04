ALTER TABLE public.card_partners ADD COLUMN IF NOT EXISTS wallet_address text;
GRANT SELECT (wallet_address), INSERT (wallet_address), UPDATE (wallet_address) ON public.card_partners TO authenticated;