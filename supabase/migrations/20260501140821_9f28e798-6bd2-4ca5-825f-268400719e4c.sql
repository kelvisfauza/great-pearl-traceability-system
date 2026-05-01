-- =============================================================
-- 1. FINANCE CASH BALANCE & TRANSACTIONS
-- =============================================================

ALTER TABLE public.finance_cash_balance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_cash_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access to finance_cash_balance" ON public.finance_cash_balance;
DROP POLICY IF EXISTS "Allow all access to finance_cash_transactions" ON public.finance_cash_transactions;
DROP POLICY IF EXISTS "Public read finance_cash_balance" ON public.finance_cash_balance;
DROP POLICY IF EXISTS "Public read finance_cash_transactions" ON public.finance_cash_transactions;

CREATE POLICY "Finance and admins can view cash balance"
  ON public.finance_cash_balance
  FOR SELECT
  TO authenticated
  USING (
    public.is_current_user_admin_by_role()
    OR public.user_has_permission('Finance')
  );

CREATE POLICY "Finance and admins can modify cash balance"
  ON public.finance_cash_balance
  FOR ALL
  TO authenticated
  USING (
    public.is_current_user_admin_by_role()
    OR public.user_has_permission('Finance')
  )
  WITH CHECK (
    public.is_current_user_admin_by_role()
    OR public.user_has_permission('Finance')
  );

CREATE POLICY "Finance and admins can view cash transactions"
  ON public.finance_cash_transactions
  FOR SELECT
  TO authenticated
  USING (
    public.is_current_user_admin_by_role()
    OR public.user_has_permission('Finance')
  );

CREATE POLICY "Finance and admins can modify cash transactions"
  ON public.finance_cash_transactions
  FOR ALL
  TO authenticated
  USING (
    public.is_current_user_admin_by_role()
    OR public.user_has_permission('Finance')
  )
  WITH CHECK (
    public.is_current_user_admin_by_role()
    OR public.user_has_permission('Finance')
  );

-- =============================================================
-- 2. BUYER CONTRACTS
-- =============================================================

DROP POLICY IF EXISTS "Allow all operations on buyer_contracts" ON public.buyer_contracts;

ALTER TABLE public.buyer_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sales procurement and admins can view buyer contracts"
  ON public.buyer_contracts
  FOR SELECT
  TO authenticated
  USING (
    public.is_current_user_admin_by_role()
    OR public.user_has_permission('Sales & Marketing')
    OR public.user_has_permission('Sales Marketing')
    OR public.user_has_permission('Procurement')
    OR public.user_has_permission('Finance')
  );

CREATE POLICY "Sales procurement and admins can insert buyer contracts"
  ON public.buyer_contracts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_current_user_admin_by_role()
    OR public.user_has_permission('Sales & Marketing')
    OR public.user_has_permission('Sales Marketing')
    OR public.user_has_permission('Procurement')
  );

CREATE POLICY "Sales procurement and admins can update buyer contracts"
  ON public.buyer_contracts
  FOR UPDATE
  TO authenticated
  USING (
    public.is_current_user_admin_by_role()
    OR public.user_has_permission('Sales & Marketing')
    OR public.user_has_permission('Sales Marketing')
    OR public.user_has_permission('Procurement')
  )
  WITH CHECK (
    public.is_current_user_admin_by_role()
    OR public.user_has_permission('Sales & Marketing')
    OR public.user_has_permission('Sales Marketing')
    OR public.user_has_permission('Procurement')
  );

CREATE POLICY "Admins can delete buyer contracts"
  ON public.buyer_contracts
  FOR DELETE
  TO authenticated
  USING (public.is_current_user_admin_by_role());