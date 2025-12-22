-- Create Christmas voucher awards table
CREATE TABLE public.christmas_vouchers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL,
  employee_email TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  voucher_amount INTEGER NOT NULL CHECK (voucher_amount > 0 AND voucher_amount <= 100000),
  performance_rank INTEGER NOT NULL,
  performance_score NUMERIC(5,2) NOT NULL,
  christmas_message TEXT NOT NULL,
  claimed_at TIMESTAMP WITH TIME ZONE,
  voucher_code TEXT UNIQUE NOT NULL DEFAULT ('XMAS-' || UPPER(SUBSTRING(gen_random_uuid()::text, 1, 8))),
  year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(employee_email, year)
);

-- Enable RLS
ALTER TABLE public.christmas_vouchers ENABLE ROW LEVEL SECURITY;

-- Users can view their own vouchers
CREATE POLICY "Users can view their own vouchers"
ON public.christmas_vouchers
FOR SELECT
USING (employee_email = current_setting('request.jwt.claims', true)::json->>'email');

-- Admins can view all vouchers
CREATE POLICY "Admins can view all vouchers"
ON public.christmas_vouchers
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employees 
    WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
    AND role IN ('Administrator', 'Super Admin')
  )
);

-- System can insert vouchers
CREATE POLICY "System can insert vouchers"
ON public.christmas_vouchers
FOR INSERT
WITH CHECK (true);

-- Users can update their own voucher (for claiming)
CREATE POLICY "Users can claim their voucher"
ON public.christmas_vouchers
FOR UPDATE
USING (employee_email = current_setting('request.jwt.claims', true)::json->>'email')
WITH CHECK (employee_email = current_setting('request.jwt.claims', true)::json->>'email');

-- Create index for performance
CREATE INDEX idx_christmas_vouchers_employee ON public.christmas_vouchers(employee_email, year);
CREATE INDEX idx_christmas_vouchers_year ON public.christmas_vouchers(year);