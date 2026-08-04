ALTER TABLE public.terminals
  ADD COLUMN IF NOT EXISTS device_serial text,
  ADD COLUMN IF NOT EXISTS device_model text,
  ADD COLUMN IF NOT EXISTS device_android_id text,
  ADD COLUMN IF NOT EXISTS app_version text;

CREATE INDEX IF NOT EXISTS terminals_device_serial_idx ON public.terminals (device_serial);