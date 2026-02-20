
-- Add bank details columns to employees table
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS bank_name text;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS account_name text;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS account_number text;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS bank_phone text;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS bank_email text;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS alternative_bank text;
