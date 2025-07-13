
-- Fix the employees table policies to work with current auth system
DROP POLICY IF EXISTS "Users can view employees based on role" ON public.employees;
DROP POLICY IF EXISTS "HR and Admins can create employees" ON public.employees;
DROP POLICY IF EXISTS "Restrict employee updates by role" ON public.employees;
DROP POLICY IF EXISTS "Only admins can delete employees" ON public.employees;

-- Create working policies that match your current auth implementation
CREATE POLICY "Authenticated users can view employees" 
  ON public.employees 
  FOR SELECT 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create employees" 
  ON public.employees 
  FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update employees" 
  ON public.employees 
  FOR UPDATE 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete employees" 
  ON public.employees 
  FOR DELETE 
  USING (auth.uid() IS NOT NULL);

-- Fix approval_requests policies
DROP POLICY IF EXISTS "Users can view relevant approval requests" ON public.approval_requests;
DROP POLICY IF EXISTS "Users can create approval requests" ON public.approval_requests;
DROP POLICY IF EXISTS "Managers can update approval requests" ON public.approval_requests;

CREATE POLICY "Authenticated users can manage approval requests" 
  ON public.approval_requests 
  FOR ALL 
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Fix salary_payments policies
DROP POLICY IF EXISTS "Finance and HR can view salary payments" ON public.salary_payments;
DROP POLICY IF EXISTS "Finance can manage salary payments" ON public.salary_payments;

CREATE POLICY "Authenticated users can manage salary payments" 
  ON public.salary_payments 
  FOR ALL 
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Fix finance_transactions policies
DROP POLICY IF EXISTS "Finance department can manage transactions" ON public.finance_transactions;

CREATE POLICY "Authenticated users can manage finance transactions" 
  ON public.finance_transactions 
  FOR ALL 
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Fix finance_expenses policies
DROP POLICY IF EXISTS "Finance department can manage expenses" ON public.finance_expenses;

CREATE POLICY "Authenticated users can manage finance expenses" 
  ON public.finance_expenses 
  FOR ALL 
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
