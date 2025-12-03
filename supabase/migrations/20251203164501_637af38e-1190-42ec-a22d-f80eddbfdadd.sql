-- Create a security definer function to get current user's email
CREATE OR REPLACE FUNCTION public.get_current_user_email()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM public.employees WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

-- Drop and recreate the INSERT policy using the new function
DROP POLICY IF EXISTS "Users can insert own daily reports" ON public.employee_daily_reports;

CREATE POLICY "Users can insert own daily reports" 
ON public.employee_daily_reports 
FOR INSERT 
WITH CHECK (employee_email = get_current_user_email());

-- Also fix the SELECT and UPDATE policies
DROP POLICY IF EXISTS "Users can view own daily reports" ON public.employee_daily_reports;

CREATE POLICY "Users can view own daily reports" 
ON public.employee_daily_reports 
FOR SELECT 
USING (
  employee_email = get_current_user_email() 
  OR user_has_permission('Human Resources'::text) 
  OR is_current_user_admin()
);

DROP POLICY IF EXISTS "Users can update own daily reports" ON public.employee_daily_reports;

CREATE POLICY "Users can update own daily reports" 
ON public.employee_daily_reports 
FOR UPDATE 
USING (
  employee_email = get_current_user_email() 
  AND report_date = CURRENT_DATE
);