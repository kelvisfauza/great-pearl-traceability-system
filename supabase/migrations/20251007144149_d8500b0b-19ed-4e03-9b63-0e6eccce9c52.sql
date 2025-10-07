-- Clear dummy data from finance_advances table
DELETE FROM public.finance_advances WHERE true;

-- Add comment
COMMENT ON TABLE public.finance_advances IS 'Finance advances tracking - cleared of dummy data and ready for real transactions';