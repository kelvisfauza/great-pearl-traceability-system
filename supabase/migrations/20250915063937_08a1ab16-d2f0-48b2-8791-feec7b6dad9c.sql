-- Add bypass SMS verification flag to employees table
ALTER TABLE public.employees 
ADD COLUMN bypass_sms_verification BOOLEAN DEFAULT false;

-- Update Timothy's account to bypass SMS verification
UPDATE public.employees 
SET bypass_sms_verification = true 
WHERE email = 'tatwanzire@gmail.com';

-- Create a function to check if user can bypass SMS verification
CREATE OR REPLACE FUNCTION public.can_bypass_sms_verification(user_email text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.employees 
    WHERE email = user_email 
    AND bypass_sms_verification = true 
    AND status = 'Active'
  );
END;
$$;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_sms_failures_created_at ON public.sms_failures(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_employees_bypass_sms ON public.employees(bypass_sms_verification) WHERE bypass_sms_verification = true;