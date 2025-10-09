-- Create overtime_awards table
CREATE TABLE public.overtime_awards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  employee_name TEXT NOT NULL,
  employee_email TEXT NOT NULL,
  department TEXT NOT NULL,
  hours INTEGER NOT NULL DEFAULT 0,
  minutes INTEGER NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, claimed, completed
  reference_number TEXT UNIQUE,
  claimed_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by TEXT NOT NULL,
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.overtime_awards ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can manage overtime awards"
  ON public.overtime_awards
  FOR ALL
  USING (is_current_user_admin());

CREATE POLICY "Users can view their own overtime awards"
  ON public.overtime_awards
  FOR SELECT
  USING (employee_email = (SELECT email FROM public.employees WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can update their own overtime claims"
  ON public.overtime_awards
  FOR UPDATE
  USING (employee_email = (SELECT email FROM public.employees WHERE auth_user_id = auth.uid()))
  WITH CHECK (employee_email = (SELECT email FROM public.employees WHERE auth_user_id = auth.uid()));

-- Add index
CREATE INDEX idx_overtime_awards_employee ON public.overtime_awards(employee_id);
CREATE INDEX idx_overtime_awards_status ON public.overtime_awards(status);
CREATE INDEX idx_overtime_awards_reference ON public.overtime_awards(reference_number);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.overtime_awards;