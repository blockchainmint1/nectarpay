-- Lightning is switched off platform-wide. No store may turn it on until this is removed.
UPDATE public.chain_configs SET enabled = false WHERE chain = 'lightning' AND enabled;
ALTER TABLE public.chain_configs
  ADD CONSTRAINT chain_configs_lightning_disabled
  CHECK (chain <> 'lightning' OR enabled = false);