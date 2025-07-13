
-- Phase 1: Emergency Database Security Fixes

-- First, create the missing user_profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id),
  UNIQUE(employee_id)
);

-- Enable RLS on user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for user_profiles
CREATE POLICY "Users can view their own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Create security audit log table
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  table_name TEXT,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on security audit log
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Only administrators can view audit logs
CREATE POLICY "Admins can view audit logs" 
  ON public.security_audit_log 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up 
      JOIN public.employees e ON up.employee_id = e.id
      WHERE up.user_id = auth.uid() AND e.role = 'Administrator'
    )
  );

-- CRITICAL: Remove all dangerous "Anyone can" policies
DROP POLICY IF EXISTS "Anyone can view employees" ON public.employees;
DROP POLICY IF EXISTS "Anyone can insert employees" ON public.employees;
DROP POLICY IF EXISTS "Anyone can update employees" ON public.employees;
DROP POLICY IF EXISTS "Anyone can delete employees" ON public.employees;

DROP POLICY IF EXISTS "Anyone can view approval requests" ON public.approval_requests;
DROP POLICY IF EXISTS "Anyone can insert approval requests" ON public.approval_requests;
DROP POLICY IF EXISTS "Anyone can update approval requests" ON public.approval_requests;
DROP POLICY IF EXISTS "Anyone can delete approval requests" ON public.approval_requests;

DROP POLICY IF EXISTS "Anyone can view salary payments" ON public.salary_payments;
DROP POLICY IF EXISTS "Anyone can insert salary payments" ON public.salary_payments;
DROP POLICY IF EXISTS "Anyone can update salary payments" ON public.salary_payments;
DROP POLICY IF EXISTS "Anyone can delete salary payments" ON public.salary_payments;

DROP POLICY IF EXISTS "Anyone can view finance_transactions" ON public.finance_transactions;
DROP POLICY IF EXISTS "Anyone can insert finance_transactions" ON public.finance_transactions;
DROP POLICY IF EXISTS "Anyone can update finance_transactions" ON public.finance_transactions;
DROP POLICY IF EXISTS "Anyone can delete finance_transactions" ON public.finance_transactions;

DROP POLICY IF EXISTS "Anyone can view finance_expenses" ON public.finance_expenses;
DROP POLICY IF EXISTS "Anyone can insert finance_expenses" ON public.finance_expenses;
DROP POLICY IF EXISTS "Anyone can update finance_expenses" ON public.finance_expenses;
DROP POLICY IF EXISTS "Anyone can delete finance_expenses" ON public.finance_expenses;

-- Create secure RLS policies for employees table with privilege escalation protection
CREATE POLICY "Secure employee viewing" 
  ON public.employees 
  FOR SELECT 
  USING (
    -- Users can view employees if they have HR permissions, are Admin/Manager, or viewing their own record
    EXISTS (
      SELECT 1 FROM public.user_profiles up 
      JOIN public.employees e ON up.employee_id = e.id
      WHERE up.user_id = auth.uid() 
      AND (
        'Human Resources' = ANY(e.permissions) OR 
        e.role IN ('Administrator', 'Manager') OR
        e.id = employees.id
      )
    )
  );

CREATE POLICY "Secure employee creation" 
  ON public.employees 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up 
      JOIN public.employees e ON up.employee_id = e.id
      WHERE up.user_id = auth.uid() 
      AND (e.role = 'Administrator' OR 'Human Resources' = ANY(e.permissions))
    )
  );

CREATE POLICY "Secure employee updates with privilege protection" 
  ON public.employees 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up 
      JOIN public.employees e ON up.employee_id = e.id
      WHERE up.user_id = auth.uid() 
      AND (
        -- Admins can update anyone
        e.role = 'Administrator' OR
        -- HR can update non-admin employees
        ('Human Resources' = ANY(e.permissions) AND employees.role != 'Administrator') OR
        -- Users can update their own non-sensitive info
        (e.id = employees.id)
      )
    )
  )
  WITH CHECK (
    -- Prevent privilege escalation - only admins can create admin roles
    (
      employees.role != 'Administrator' OR 
      EXISTS (
        SELECT 1 FROM public.user_profiles up 
        JOIN public.employees e ON up.employee_id = e.id
        WHERE up.user_id = auth.uid() AND e.role = 'Administrator'
      )
    ) AND
    -- Prevent permission escalation - only admins can grant sensitive permissions
    (
      NOT ('Human Resources' = ANY(employees.permissions) OR 'Finance' = ANY(employees.permissions)) OR
      EXISTS (
        SELECT 1 FROM public.user_profiles up 
        JOIN public.employees e ON up.employee_id = e.id
        WHERE up.user_id = auth.uid() AND e.role = 'Administrator'
      )
    )
  );

CREATE POLICY "Secure employee deletion" 
  ON public.employees 
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up 
      JOIN public.employees e ON up.employee_id = e.id
      WHERE up.user_id = auth.uid() AND e.role = 'Administrator'
    )
  );

-- Secure approval_requests policies
CREATE POLICY "Secure approval requests viewing" 
  ON public.approval_requests 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up 
      JOIN public.employees e ON up.employee_id = e.id
      WHERE up.user_id = auth.uid() 
      AND (
        e.role IN ('Administrator', 'Manager') OR
        e.department = approval_requests.department OR
        e.name = approval_requests.requestedby
      )
    )
  );

CREATE POLICY "Secure approval requests creation" 
  ON public.approval_requests 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up 
      JOIN public.employees e ON up.employee_id = e.id
      WHERE up.user_id = auth.uid() 
      AND e.name = approval_requests.requestedby
    )
  );

CREATE POLICY "Secure approval requests updates" 
  ON public.approval_requests 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up 
      JOIN public.employees e ON up.employee_id = e.id
      WHERE up.user_id = auth.uid() 
      AND (
        e.role IN ('Administrator', 'Manager') OR
        ('Finance' = ANY(e.permissions) AND approval_requests.type = 'Salary Payment')
      )
    )
  );

-- Secure finance tables
CREATE POLICY "Secure finance transactions" 
  ON public.finance_transactions 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up 
      JOIN public.employees e ON up.employee_id = e.id
      WHERE up.user_id = auth.uid() 
      AND (e.role = 'Administrator' OR 'Finance' = ANY(e.permissions))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up 
      JOIN public.employees e ON up.employee_id = e.id
      WHERE up.user_id = auth.uid() 
      AND (e.role = 'Administrator' OR 'Finance' = ANY(e.permissions))
    )
  );

CREATE POLICY "Secure finance expenses" 
  ON public.finance_expenses 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up 
      JOIN public.employees e ON up.employee_id = e.id
      WHERE up.user_id = auth.uid() 
      AND (e.role = 'Administrator' OR 'Finance' = ANY(e.permissions))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up 
      JOIN public.employees e ON up.employee_id = e.id
      WHERE up.user_id = auth.uid() 
      AND (e.role = 'Administrator' OR 'Finance' = ANY(e.permissions))
    )
  );

CREATE POLICY "Secure salary payments" 
  ON public.salary_payments 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up 
      JOIN public.employees e ON up.employee_id = e.id
      WHERE up.user_id = auth.uid() 
      AND (
        e.role = 'Administrator' OR 
        'Finance' = ANY(e.permissions) OR 
        'Human Resources' = ANY(e.permissions)
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up 
      JOIN public.employees e ON up.employee_id = e.id
      WHERE up.user_id = auth.uid() 
      AND (e.role = 'Administrator' OR 'Finance' = ANY(e.permissions))
    )
  );

-- Function to automatically create user profile when employee is created with email matching auth user
CREATE OR REPLACE FUNCTION public.handle_employee_user_link()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Try to link employee to existing auth user with same email
  INSERT INTO public.user_profiles (user_id, employee_id)
  SELECT au.id, NEW.id
  FROM auth.users au
  WHERE au.email = NEW.email
  ON CONFLICT (user_id) DO NOTHING
  ON CONFLICT (employee_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Create trigger to automatically link employees to users
DROP TRIGGER IF EXISTS on_employee_created ON public.employees;
CREATE TRIGGER on_employee_created
  AFTER INSERT ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_employee_user_link();

-- Fix the function security warning by setting search_path
CREATE OR REPLACE FUNCTION public."great pearl"(conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM conversation_participants 
    WHERE conversation_participants.conversation_id = $1 
    AND user_id = auth.uid()
  );
$$;
