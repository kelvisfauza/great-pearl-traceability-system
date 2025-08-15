-- Create security definer function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.employees 
    WHERE auth_user_id = auth.uid() 
    AND role = 'Administrator'
    AND status = 'Active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create deletion requests table for non-admin users
CREATE TABLE IF NOT EXISTS public.deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  record_data JSONB NOT NULL,
  reason TEXT NOT NULL,
  requested_by TEXT NOT NULL,
  requested_by_department TEXT NOT NULL,
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  reviewed_by TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_comments TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on deletion_requests
ALTER TABLE public.deletion_requests ENABLE ROW LEVEL SECURITY;

-- Policies for deletion_requests
CREATE POLICY "Anyone can view deletion requests" ON public.deletion_requests
FOR SELECT USING (true);

CREATE POLICY "Users can create deletion requests" ON public.deletion_requests
FOR INSERT WITH CHECK (true);

CREATE POLICY "Only admins can update deletion requests" ON public.deletion_requests
FOR UPDATE USING (public.is_current_user_admin());

-- Update DELETE policies for all major tables to admin-only

-- Metrics table
DROP POLICY IF EXISTS "Anyone can delete metrics" ON public.metrics;
CREATE POLICY "Only admins can delete metrics" ON public.metrics
FOR DELETE USING (public.is_current_user_admin());

-- Finance expenses
DROP POLICY IF EXISTS "Anyone can delete finance_expenses" ON public.finance_expenses;
CREATE POLICY "Only admins can delete finance_expenses" ON public.finance_expenses
FOR DELETE USING (public.is_current_user_admin());

-- Payment records
DROP POLICY IF EXISTS "Anyone can delete payment_records" ON public.payment_records;
CREATE POLICY "Only admins can delete payment_records" ON public.payment_records
FOR DELETE USING (public.is_current_user_admin());

-- Performance data
DROP POLICY IF EXISTS "Anyone can delete performance_data" ON public.performance_data;
CREATE POLICY "Only admins can delete performance_data" ON public.performance_data
FOR DELETE USING (public.is_current_user_admin());

-- Reports
DROP POLICY IF EXISTS "Anyone can delete reports" ON public.reports;
CREATE POLICY "Only admins can delete reports" ON public.reports
FOR DELETE USING (public.is_current_user_admin());

-- Quality assessments
DROP POLICY IF EXISTS "Anyone can delete quality_assessments" ON public.quality_assessments;
CREATE POLICY "Only admins can delete quality_assessments" ON public.quality_assessments
FOR DELETE USING (public.is_current_user_admin());

-- Suppliers
DROP POLICY IF EXISTS "Anyone can delete suppliers" ON public.suppliers;
CREATE POLICY "Only admins can delete suppliers" ON public.suppliers
FOR DELETE USING (public.is_current_user_admin());

-- Finance transactions
DROP POLICY IF EXISTS "Anyone can delete finance_transactions" ON public.finance_transactions;
CREATE POLICY "Only admins can delete finance_transactions" ON public.finance_transactions
FOR DELETE USING (public.is_current_user_admin());

-- Supplier contracts
DROP POLICY IF EXISTS "Anyone can delete supplier contracts" ON public.supplier_contracts;
CREATE POLICY "Only admins can delete supplier_contracts" ON public.supplier_contracts
FOR DELETE USING (public.is_current_user_admin());

-- Approval requests
DROP POLICY IF EXISTS "Anyone can delete approval requests" ON public.approval_requests;
CREATE POLICY "Only admins can delete approval_requests" ON public.approval_requests
FOR DELETE USING (public.is_current_user_admin());

-- Salary payments
DROP POLICY IF EXISTS "Anyone can delete salary payments" ON public.salary_payments;
CREATE POLICY "Only admins can delete salary_payments" ON public.salary_payments
FOR DELETE USING (public.is_current_user_admin());

-- Daily tasks
DROP POLICY IF EXISTS "Anyone can delete daily_tasks" ON public.daily_tasks;
CREATE POLICY "Only admins can delete daily_tasks" ON public.daily_tasks
FOR DELETE USING (public.is_current_user_admin());

-- Coffee records
DROP POLICY IF EXISTS "Anyone can delete coffee_records" ON public.coffee_records;
CREATE POLICY "Only admins can delete coffee_records" ON public.coffee_records
FOR DELETE USING (public.is_current_user_admin());

-- Contract approvals
DROP POLICY IF EXISTS "Anyone can delete contract approvals" ON public.contract_approvals;
CREATE POLICY "Only admins can delete contract_approvals" ON public.contract_approvals
FOR DELETE USING (public.is_current_user_admin());

-- Employees (special handling)
DROP POLICY IF EXISTS "employees_delete_policy" ON public.employees;
CREATE POLICY "Only admins can delete employees" ON public.employees
FOR DELETE USING (public.is_current_user_admin());

-- Add function to automatically execute approved deletions
CREATE OR REPLACE FUNCTION public.execute_approved_deletion()
RETURNS TRIGGER AS $$
BEGIN
  -- Only execute if status changed to approved
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    -- Execute the deletion based on table_name
    EXECUTE format('DELETE FROM public.%I WHERE id = $1', NEW.table_name) 
    USING NEW.record_id::uuid;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic deletion execution
CREATE OR REPLACE TRIGGER execute_deletion_trigger
  AFTER UPDATE ON public.deletion_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.execute_approved_deletion();

-- Update timestamp trigger for deletion_requests
CREATE OR REPLACE FUNCTION public.update_deletion_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER update_deletion_requests_updated_at
  BEFORE UPDATE ON public.deletion_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_deletion_requests_updated_at();