
ALTER TABLE public.withdrawal_requests ADD COLUMN IF NOT EXISTS disbursement_phone TEXT;
ALTER TABLE public.withdrawal_requests ADD COLUMN IF NOT EXISTS disbursement_bank_name TEXT;
ALTER TABLE public.withdrawal_requests ADD COLUMN IF NOT EXISTS disbursement_account_number TEXT;
ALTER TABLE public.withdrawal_requests ADD COLUMN IF NOT EXISTS disbursement_account_name TEXT;
