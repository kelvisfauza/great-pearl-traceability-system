
-- Create bonuses table for HR to allocate bonuses to employees
CREATE TABLE public.bonuses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL,
  employee_email TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending, claimed
  allocated_by TEXT NOT NULL,
  allocated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  claimed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bonuses ENABLE ROW LEVEL SECURITY;

-- Policies: employees can see their own bonuses
CREATE POLICY "Employees can view their own bonuses"
ON public.bonuses FOR SELECT
USING (
  employee_email = (SELECT email FROM public.employees WHERE auth_user_id = auth.uid() LIMIT 1)
);

-- Admins/HR can view all bonuses
CREATE POLICY "Admins can view all bonuses"
ON public.bonuses FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.employees
    WHERE auth_user_id = auth.uid()
    AND (role IN ('Administrator', 'Super Admin') OR department = 'Human Resources')
    AND status = 'Active'
  )
);

-- Admins/HR can insert bonuses
CREATE POLICY "Admins can allocate bonuses"
ON public.bonuses FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.employees
    WHERE auth_user_id = auth.uid()
    AND (role IN ('Administrator', 'Super Admin') OR department = 'Human Resources')
    AND status = 'Active'
  )
);

-- Employees can update their own bonuses (for claiming)
CREATE POLICY "Employees can claim their bonuses"
ON public.bonuses FOR UPDATE
USING (
  employee_email = (SELECT email FROM public.employees WHERE auth_user_id = auth.uid() LIMIT 1)
);

-- Admins can update/delete bonuses
CREATE POLICY "Admins can manage bonuses"
ON public.bonuses FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.employees
    WHERE auth_user_id = auth.uid()
    AND (role IN ('Administrator', 'Super Admin') OR department = 'Human Resources')
    AND status = 'Active'
  )
);

CREATE POLICY "Admins can delete bonuses"
ON public.bonuses FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.employees
    WHERE auth_user_id = auth.uid()
    AND (role IN ('Administrator', 'Super Admin') OR department = 'Human Resources')
    AND status = 'Active'
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_bonuses_updated_at
BEFORE UPDATE ON public.bonuses
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
