
-- Table for tracking auto-deductions and appeals
CREATE TABLE public.absence_appeals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL,
  employee_name TEXT NOT NULL,
  employee_email TEXT NOT NULL,
  deduction_date DATE NOT NULL,
  deduction_amount NUMERIC NOT NULL DEFAULT 5000,
  ledger_reference TEXT NOT NULL,
  reason TEXT,
  appeal_status TEXT NOT NULL DEFAULT 'none', -- none, pending, approved, rejected
  appeal_submitted_at TIMESTAMPTZ,
  appeal_reason TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  refund_ledger_reference TEXT,
  sms_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(employee_id, deduction_date)
);

ALTER TABLE public.absence_appeals ENABLE ROW LEVEL SECURITY;

-- Employees can view their own appeals
CREATE POLICY "Users can view own appeals"
ON public.absence_appeals
FOR SELECT
USING (
  employee_email = (SELECT email FROM employees WHERE auth_user_id = auth.uid() LIMIT 1)
  OR EXISTS (SELECT 1 FROM employees WHERE auth_user_id = auth.uid() AND role IN ('Super Admin', 'Administrator', 'HR'))
);

-- Employees can update their own appeals (submit appeal)
CREATE POLICY "Users can appeal own deductions"
ON public.absence_appeals
FOR UPDATE
USING (
  employee_email = (SELECT email FROM employees WHERE auth_user_id = auth.uid() LIMIT 1)
)
WITH CHECK (
  employee_email = (SELECT email FROM employees WHERE auth_user_id = auth.uid() LIMIT 1)
);

-- System/admins can insert
CREATE POLICY "System can insert appeals"
ON public.absence_appeals
FOR INSERT
WITH CHECK (true);

-- Admins can update (approve/reject)
CREATE POLICY "Admins can manage appeals"
ON public.absence_appeals
FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM employees WHERE auth_user_id = auth.uid() AND role IN ('Super Admin', 'Administrator', 'HR'))
);

-- Trigger for updated_at
CREATE TRIGGER update_absence_appeals_updated_at
BEFORE UPDATE ON public.absence_appeals
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
