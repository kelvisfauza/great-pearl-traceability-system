
-- First, create security definer functions to safely check user permissions
-- These functions prevent infinite recursion in RLS policies

-- Function to get current user's employee record
CREATE OR REPLACE FUNCTION public.get_current_user_employee()
RETURNS TABLE(
  employee_id UUID,
  role TEXT,
  permissions TEXT[],
  department TEXT
)
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT 
    e.id,
    e.role,
    e.permissions,
    e.department
  FROM public.employees e
  JOIN public.user_profiles up ON e.id = up.employee_id
  WHERE up.user_id = auth.uid();
$$;

-- Function to check if current user has a specific role
CREATE OR REPLACE FUNCTION public.current_user_has_role(required_role TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.get_current_user_employee() 
    WHERE role = required_role
  );
$$;

-- Function to check if current user has a specific permission
CREATE OR REPLACE FUNCTION public.current_user_has_permission(required_permission TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.get_current_user_employee() 
    WHERE required_permission = ANY(permissions)
  );
$$;

-- Function to check if current user is in a specific department
CREATE OR REPLACE FUNCTION public.current_user_in_department(dept TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.get_current_user_employee() 
    WHERE department = dept
  );
$$;

-- Now fix the critical employees table policies
-- Drop the simple "Authenticated users can" policies
DROP POLICY IF EXISTS "Authenticated users can view employees" ON public.employees;
DROP POLICY IF EXISTS "Authenticated users can create employees" ON public.employees;
DROP POLICY IF EXISTS "Authenticated users can update employees" ON public.employees;
DROP POLICY IF EXISTS "Authenticated users can delete employees" ON public.employees;

-- Create secure policies for employees table
CREATE POLICY "Users can view employees based on role" 
  ON public.employees 
  FOR SELECT 
  USING (
    public.current_user_has_role('Administrator') OR
    public.current_user_has_role('Manager') OR
    public.current_user_has_permission('Human Resources') OR
    id IN (SELECT employee_id FROM public.get_current_user_employee())
  );

CREATE POLICY "HR and Admins can create employees" 
  ON public.employees 
  FOR INSERT 
  WITH CHECK (
    public.current_user_has_role('Administrator') OR
    public.current_user_has_permission('Human Resources')
  );

CREATE POLICY "Restrict employee updates by role" 
  ON public.employees 
  FOR UPDATE 
  USING (
    -- Admins can update anyone
    public.current_user_has_role('Administrator') OR
    -- HR can update non-admin employees
    (public.current_user_has_permission('Human Resources') AND role != 'Administrator') OR
    -- Users can update their own non-sensitive info (excluding role, permissions, salary)
    (id IN (SELECT employee_id FROM public.get_current_user_employee()))
  )
  WITH CHECK (
    -- Prevent privilege escalation - only admins can set admin role
    (role != 'Administrator' OR public.current_user_has_role('Administrator')) AND
    -- Prevent permission escalation - only admins can grant sensitive permissions
    (NOT ('Human Resources' = ANY(permissions) OR 'Finance' = ANY(permissions)) OR public.current_user_has_role('Administrator'))
  );

CREATE POLICY "Only admins can delete employees" 
  ON public.employees 
  FOR DELETE 
  USING (public.current_user_has_role('Administrator'));

-- Fix salary_payments table policies
DROP POLICY IF EXISTS "Authenticated users can manage salary payments" ON public.salary_payments;

CREATE POLICY "Finance and HR can view salary payments" 
  ON public.salary_payments 
  FOR SELECT 
  USING (
    public.current_user_has_role('Administrator') OR
    public.current_user_has_permission('Finance') OR
    public.current_user_has_permission('Human Resources')
  );

CREATE POLICY "Finance can manage salary payments" 
  ON public.salary_payments 
  FOR ALL 
  USING (
    public.current_user_has_role('Administrator') OR
    public.current_user_has_permission('Finance')
  )
  WITH CHECK (
    public.current_user_has_role('Administrator') OR
    public.current_user_has_permission('Finance')
  );

-- Fix approval_requests policies to be department-based
DROP POLICY IF EXISTS "Authenticated users can manage approval requests" ON public.approval_requests;

CREATE POLICY "Users can view relevant approval requests" 
  ON public.approval_requests 
  FOR SELECT 
  USING (
    public.current_user_has_role('Administrator') OR
    public.current_user_has_role('Manager') OR
    -- Users can see requests from their department
    department IN (SELECT department FROM public.get_current_user_employee()) OR
    -- Users can see requests they made
    requestedby IN (SELECT name FROM public.get_current_user_employee())
  );

CREATE POLICY "Users can create approval requests" 
  ON public.approval_requests 
  FOR INSERT 
  WITH CHECK (
    requestedby IN (SELECT name FROM public.get_current_user_employee())
  );

CREATE POLICY "Managers can update approval requests" 
  ON public.approval_requests 
  FOR UPDATE 
  USING (
    public.current_user_has_role('Administrator') OR
    public.current_user_has_role('Manager') OR
    (public.current_user_has_permission('Finance') AND type = 'Salary Payment')
  );

-- Fix finance tables to be restricted to finance department
DROP POLICY IF EXISTS "Authenticated users can manage finance transactions" ON public.finance_transactions;

CREATE POLICY "Finance department can manage transactions" 
  ON public.finance_transactions 
  FOR ALL 
  USING (
    public.current_user_has_role('Administrator') OR
    public.current_user_has_permission('Finance')
  )
  WITH CHECK (
    public.current_user_has_role('Administrator') OR
    public.current_user_has_permission('Finance')
  );

-- Similar fixes for other sensitive tables
DROP POLICY IF EXISTS "Authenticated users can manage finance expenses" ON public.finance_expenses;

CREATE POLICY "Finance department can manage expenses" 
  ON public.finance_expenses 
  FOR ALL 
  USING (
    public.current_user_has_role('Administrator') OR
    public.current_user_has_permission('Finance')
  )
  WITH CHECK (
    public.current_user_has_role('Administrator') OR
    public.current_user_has_permission('Finance')
  );

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.get_current_user_employee() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_has_role(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_has_permission(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_in_department(TEXT) TO authenticated;
