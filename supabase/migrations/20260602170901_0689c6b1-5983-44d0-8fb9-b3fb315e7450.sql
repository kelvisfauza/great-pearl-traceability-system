-- ============================================
-- OVERDRAFT PROGRAM
-- ============================================

-- 1) Applications
CREATE TABLE public.overdraft_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  employee_email TEXT NOT NULL,
  employee_name TEXT,
  requested_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  calculated_limit NUMERIC(14,2) NOT NULL DEFAULT 0,
  approved_limit NUMERIC(14,2),
  status TEXT NOT NULL DEFAULT 'pending',
  factors JSONB DEFAULT '{}'::jsonb,
  reason TEXT,
  rejection_reason TEXT,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.overdraft_applications TO authenticated;
GRANT ALL ON public.overdraft_applications TO service_role;

ALTER TABLE public.overdraft_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own overdraft applications"
ON public.overdraft_applications FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR employee_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  OR public.has_role(auth.uid(), 'Administrator'::app_role)
  OR public.has_role(auth.uid(), 'Super Admin'::app_role)
);

CREATE POLICY "Users can submit their own overdraft application"
ON public.overdraft_applications FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  OR employee_email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

CREATE POLICY "Admins can update overdraft applications"
ON public.overdraft_applications FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'Administrator'::app_role)
  OR public.has_role(auth.uid(), 'Super Admin'::app_role)
);

CREATE INDEX idx_overdraft_apps_user ON public.overdraft_applications(user_id);
CREATE INDEX idx_overdraft_apps_status ON public.overdraft_applications(status);

-- 2) Active Accounts (one per user)
CREATE TABLE public.overdraft_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  employee_email TEXT NOT NULL,
  employee_name TEXT,
  approved_limit NUMERIC(14,2) NOT NULL DEFAULT 0,
  outstanding_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_drawn NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_recovered NUMERIC(14,2) NOT NULL DEFAULT 0,
  activation_fee NUMERIC(14,2) NOT NULL DEFAULT 0,
  activation_fee_paid BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active',
  approved_by TEXT,
  approved_at TIMESTAMPTZ DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  application_id UUID REFERENCES public.overdraft_applications(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.overdraft_accounts TO authenticated;
GRANT ALL ON public.overdraft_accounts TO service_role;

ALTER TABLE public.overdraft_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own overdraft account"
ON public.overdraft_accounts FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR employee_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  OR public.has_role(auth.uid(), 'Administrator'::app_role)
  OR public.has_role(auth.uid(), 'Super Admin'::app_role)
  OR public.has_role(auth.uid(), 'finance_manager'::app_role)
  OR public.has_role(auth.uid(), 'finance_assistant'::app_role)
);

CREATE INDEX idx_overdraft_accounts_email ON public.overdraft_accounts(employee_email);
CREATE INDEX idx_overdraft_accounts_status ON public.overdraft_accounts(status);

-- 3) Transactions on the overdraft account
CREATE TABLE public.overdraft_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.overdraft_accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  transaction_type TEXT NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  balance_after NUMERIC(14,2) NOT NULL,
  ledger_entry_id UUID,
  reference TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.overdraft_transactions TO authenticated;
GRANT ALL ON public.overdraft_transactions TO service_role;

ALTER TABLE public.overdraft_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own overdraft transactions"
ON public.overdraft_transactions FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'Administrator'::app_role)
  OR public.has_role(auth.uid(), 'Super Admin'::app_role)
  OR public.has_role(auth.uid(), 'finance_manager'::app_role)
  OR public.has_role(auth.uid(), 'finance_assistant'::app_role)
);

CREATE INDEX idx_overdraft_tx_account ON public.overdraft_transactions(account_id);
CREATE INDEX idx_overdraft_tx_user ON public.overdraft_transactions(user_id);

-- 4) Timestamps trigger
CREATE TRIGGER update_overdraft_apps_updated_at
BEFORE UPDATE ON public.overdraft_applications
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_overdraft_accounts_updated_at
BEFORE UPDATE ON public.overdraft_accounts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) Helper: fetch a user's overdraft state by email
CREATE OR REPLACE FUNCTION public.get_overdraft_account(user_email TEXT)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  approved_limit NUMERIC,
  outstanding_balance NUMERIC,
  available_overdraft NUMERIC,
  status TEXT,
  approved_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    oa.id,
    oa.user_id,
    oa.approved_limit,
    oa.outstanding_balance,
    GREATEST(0, oa.approved_limit - oa.outstanding_balance) AS available_overdraft,
    oa.status,
    oa.approved_at,
    oa.last_used_at
  FROM public.overdraft_accounts oa
  WHERE oa.employee_email = user_email
    AND oa.status = 'active'
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_overdraft_account(TEXT) TO authenticated, anon, service_role;