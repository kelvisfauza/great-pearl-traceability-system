
ALTER TABLE public.admin_wallet_operations
  ADD COLUMN IF NOT EXISTS confirmation_method text NOT NULL DEFAULT 'second_admin',
  ADD COLUMN IF NOT EXISTS otp_hash text,
  ADD COLUMN IF NOT EXISTS otp_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS otp_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS otp_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS otp_confirmed_by text;

ALTER TABLE public.admin_wallet_operations
  DROP CONSTRAINT IF EXISTS admin_wallet_operations_confirmation_method_check;
ALTER TABLE public.admin_wallet_operations
  ADD CONSTRAINT admin_wallet_operations_confirmation_method_check
  CHECK (confirmation_method IN ('second_admin','user_otp'));
