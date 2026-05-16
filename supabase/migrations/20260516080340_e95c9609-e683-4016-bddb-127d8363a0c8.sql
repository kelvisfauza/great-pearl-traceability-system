ALTER TABLE public.employees 
  ADD COLUMN IF NOT EXISTS tin_number text,
  ADD COLUMN IF NOT EXISTS nssf_number text;