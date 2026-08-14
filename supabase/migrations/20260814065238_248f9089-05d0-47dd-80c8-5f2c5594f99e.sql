ALTER TABLE public.admin_wallet_operations
  DROP CONSTRAINT IF EXISTS admin_wallet_operations_confirmation_method_check;
ALTER TABLE public.admin_wallet_operations
  ADD CONSTRAINT admin_wallet_operations_confirmation_method_check
  CHECK (confirmation_method IN ('second_admin','user_otp','instant'));