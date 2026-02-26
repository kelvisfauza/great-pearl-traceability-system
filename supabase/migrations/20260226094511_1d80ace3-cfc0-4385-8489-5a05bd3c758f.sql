
-- Loans table
CREATE TABLE public.loans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL,
  employee_email TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  employee_phone TEXT,
  loan_amount NUMERIC NOT NULL,
  interest_rate NUMERIC NOT NULL, -- e.g. 5, 8, 10, 12, 13, 15
  total_repayable NUMERIC NOT NULL, -- loan_amount + interest
  duration_months INTEGER NOT NULL CHECK (duration_months BETWEEN 1 AND 6),
  monthly_installment NUMERIC NOT NULL,
  disbursed_amount NUMERIC DEFAULT 0,
  paid_amount NUMERIC DEFAULT 0,
  remaining_balance NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_guarantor', -- pending_guarantor, pending_admin, approved, disbursed, active, completed, defaulted, rejected
  guarantor_id UUID,
  guarantor_email TEXT,
  guarantor_name TEXT,
  guarantor_phone TEXT,
  guarantor_approval_code TEXT,
  guarantor_approved BOOLEAN DEFAULT false,
  guarantor_approved_at TIMESTAMPTZ,
  guarantor_declined BOOLEAN DEFAULT false,
  admin_approved BOOLEAN DEFAULT false,
  admin_approved_by TEXT,
  admin_approved_at TIMESTAMPTZ,
  admin_rejection_reason TEXT,
  start_date DATE,
  end_date DATE,
  next_deduction_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can view own loans" ON public.loans FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert loans" ON public.loans FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can update loans" ON public.loans FOR UPDATE USING (true);

-- Loan repayments table
CREATE TABLE public.loan_repayments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  loan_id UUID NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
  installment_number INTEGER NOT NULL,
  amount_due NUMERIC NOT NULL,
  amount_paid NUMERIC DEFAULT 0,
  due_date DATE NOT NULL,
  paid_date DATE,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, paid, overdue, deducted_from_guarantor
  deducted_from TEXT, -- 'employee' or 'guarantor'
  payment_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.loan_repayments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view repayments" ON public.loan_repayments FOR SELECT USING (true);
CREATE POLICY "System can insert repayments" ON public.loan_repayments FOR INSERT WITH CHECK (true);
CREATE POLICY "System can update repayments" ON public.loan_repayments FOR UPDATE USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_loans_updated_at BEFORE UPDATE ON public.loans FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_loan_repayments_updated_at BEFORE UPDATE ON public.loan_repayments FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Index for performance
CREATE INDEX idx_loans_employee_email ON public.loans(employee_email);
CREATE INDEX idx_loans_status ON public.loans(status);
CREATE INDEX idx_loans_guarantor_email ON public.loans(guarantor_email);
CREATE INDEX idx_loan_repayments_loan_id ON public.loan_repayments(loan_id);
CREATE INDEX idx_loan_repayments_due_date ON public.loan_repayments(due_date);
