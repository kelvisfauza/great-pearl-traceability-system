CREATE TABLE public.contract_renewal_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_email TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  current_contract_id UUID REFERENCES public.employee_contracts(id),
  requested_months INTEGER NOT NULL,
  reason TEXT NOT NULL,
  updated_phone TEXT,
  emergency_contact TEXT,
  nssf_number TEXT,
  tin_number TEXT,
  bank_name TEXT,
  bank_account TEXT,
  policy_acknowledged BOOLEAN NOT NULL DEFAULT false,
  signature TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_email TEXT,
  admin_notes TEXT,
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  new_contract_id UUID REFERENCES public.employee_contracts(id),
  pdf_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT renewal_months_range CHECK (requested_months BETWEEN 3 AND 6),
  CONSTRAINT renewal_status_values CHECK (status IN ('pending','approved','rejected'))
);

GRANT SELECT, INSERT, UPDATE ON public.contract_renewal_requests TO authenticated;
GRANT ALL ON public.contract_renewal_requests TO service_role;

ALTER TABLE public.contract_renewal_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees view own renewal requests"
  ON public.contract_renewal_requests FOR SELECT TO authenticated
  USING (
    lower(employee_email) = lower(coalesce((auth.jwt() ->> 'email')::text, ''))
    OR EXISTS (
      SELECT 1 FROM public.employees e
      WHERE lower(e.email) = lower(coalesce((auth.jwt() ->> 'email')::text, ''))
        AND (e.role IN ('Administrator','Super Admin') OR e.department = 'Human Resources')
    )
  );

CREATE POLICY "Employees create own renewal requests"
  ON public.contract_renewal_requests FOR INSERT TO authenticated
  WITH CHECK (lower(employee_email) = lower(coalesce((auth.jwt() ->> 'email')::text, '')));

CREATE POLICY "Admins and HR update renewal requests"
  ON public.contract_renewal_requests FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE lower(e.email) = lower(coalesce((auth.jwt() ->> 'email')::text, ''))
        AND (e.role IN ('Administrator','Super Admin') OR e.department = 'Human Resources')
    )
  );

CREATE INDEX idx_renewal_requests_employee ON public.contract_renewal_requests(employee_email, status);
CREATE INDEX idx_renewal_requests_status ON public.contract_renewal_requests(status, created_at DESC);

CREATE TRIGGER trg_renewal_requests_updated_at
  BEFORE UPDATE ON public.contract_renewal_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();