-- Temporary half-salary agreements for October through December 2026.
-- The employees' base salaries remain unchanged; payroll applies this policy
-- only when the payroll month falls inside the effective date range.

CREATE TABLE IF NOT EXISTS public.salary_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_email text NOT NULL,
  pay_percentage numeric(5,2) NOT NULL CHECK (pay_percentage > 0 AND pay_percentage <= 100),
  reason text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'completed')),
  agreement_reference text,
  created_by text NOT NULL DEFAULT 'Management',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date)
);

CREATE UNIQUE INDEX IF NOT EXISTS salary_adjustments_employee_period_uidx
  ON public.salary_adjustments (lower(employee_email), start_date, end_date)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS salary_adjustments_effective_period_idx
  ON public.salary_adjustments (start_date, end_date)
  WHERE status = 'active';

ALTER TABLE public.salary_adjustments ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.employee_salary_payments
  ADD COLUMN IF NOT EXISTS base_salary numeric,
  ADD COLUMN IF NOT EXISTS salary_adjustment_id uuid REFERENCES public.salary_adjustments(id),
  ADD COLUMN IF NOT EXISTS salary_adjustment_percentage numeric(5,2),
  ADD COLUMN IF NOT EXISTS salary_adjustment_amount numeric NOT NULL DEFAULT 0;

INSERT INTO public.salary_adjustments (
  employee_email,
  pay_percentage,
  reason,
  start_date,
  end_date,
  agreement_reference,
  created_by
)
VALUES
  (
    'nuwagabagadaffi@greatpearlcoffee.com',
    50,
    'Management-approved disciplinary recovery agreement: half salary for three months',
    DATE '2026-10-01',
    DATE '2026-12-31',
    'SIGNED-HALF-PAY-AGREEMENT-2026',
    'Management'
  ),
  (
    'onesmusrubambura@greatpearlcoffee.com',
    50,
    'Management-approved disciplinary recovery agreement: half salary for three months',
    DATE '2026-10-01',
    DATE '2026-12-31',
    'SIGNED-HALF-PAY-AGREEMENT-2026',
    'Management'
  ),
  (
    'johnmasereka@greatpearlcoffee.com',
    50,
    'Management-approved disciplinary recovery agreement: half salary for three months',
    DATE '2026-10-01',
    DATE '2026-12-31',
    'SIGNED-HALF-PAY-AGREEMENT-2026',
    'Management'
  )
ON CONFLICT DO NOTHING;

COMMENT ON TABLE public.salary_adjustments IS
  'Time-bound payroll adjustments. Employee base salary is never modified.';

COMMENT ON COLUMN public.salary_adjustments.pay_percentage IS
  'Percentage of base salary treated as gross pay during the effective period.';
