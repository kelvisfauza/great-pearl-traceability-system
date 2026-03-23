-- FIX 1: Add SET search_path to SECURITY DEFINER functions

CREATE OR REPLACE FUNCTION public.withdrawal_requests_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
BEGIN
DELETE FROM money_requests
WHERE id = OLD.id
AND request_type = 'withdrawal';
RETURN OLD;
END;
$function$;

CREATE OR REPLACE FUNCTION public.withdrawal_requests_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
BEGIN
INSERT INTO money_requests (
id, user_id, amount, reason, status, request_type,
phone_number, payment_channel, disbursement_bank_name,
disbursement_account_number, disbursement_account_name,
requested_by, requires_three_approvals, wallet_balance_verified
) VALUES (
COALESCE(NEW.id, gen_random_uuid()), NEW.user_id, NEW.amount,
COALESCE(NEW.reason, 'Wallet Withdrawal'), COALESCE(NEW.status, 'pending_finance'),
'withdrawal', NEW.phone_number, NEW.payment_channel, NEW.disbursement_bank_name,
NEW.disbursement_account_number, NEW.disbursement_account_name,
NEW.requested_by, COALESCE(NEW.requires_three_approvals, false),
COALESCE(NEW.wallet_balance_verified, false)
);
RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.withdrawal_requests_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
BEGIN
UPDATE money_requests
SET
amount = NEW.amount, reason = NEW.reason, status = NEW.status,
phone_number = NEW.phone_number, payment_channel = NEW.payment_channel,
disbursement_bank_name = NEW.disbursement_bank_name,
disbursement_account_number = NEW.disbursement_account_number,
disbursement_account_name = NEW.disbursement_account_name,
requires_three_approvals = NEW.requires_three_approvals,
wallet_balance_verified = NEW.wallet_balance_verified,
wallet_balance_at_approval = NEW.wallet_balance_at_approval,
admin_approved = NEW.admin_approved,
admin_approved_1 = NEW.admin_approved_1,
admin_approved_1_by = NEW.admin_approved_1_by,
admin_approved_1_at = NEW.admin_approved_1_at,
admin_approved_2 = NEW.admin_approved_2,
admin_approved_2_by = NEW.admin_approved_2_by,
admin_approved_2_at = NEW.admin_approved_2_at,
admin_approved_3 = NEW.admin_approved_3,
admin_approved_3_by = NEW.admin_approved_3_by,
admin_approved_3_at = NEW.admin_approved_3_at,
approved_by = NEW.approved_by,
approved_at = NEW.approved_at,
rejection_reason = NEW.rejection_reason,
finance_approved_by = NEW.finance_approved_by,
finance_approved_at = NEW.finance_approved_at,
finance_reviewed = NEW.finance_reviewed,
finance_review_at = NEW.finance_review_at,
finance_review_by = NEW.finance_review_by,
admin_final_approval = NEW.admin_final_approval,
admin_final_approval_at = NEW.admin_final_approval_at,
admin_final_approval_by = NEW.admin_final_approval_by,
updated_at = now()
WHERE id = OLD.id
AND request_type = 'withdrawal';
RETURN NEW;
END;
$function$;

-- FIX 2: Enable RLS on financial tables + add policies

ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cheques ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entry_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance can manage bills" ON public.bills FOR ALL
  TO authenticated USING (public.user_has_permission('Finance') OR public.is_current_user_admin())
  WITH CHECK (public.user_has_permission('Finance') OR public.is_current_user_admin());

CREATE POLICY "Finance can manage chart_of_accounts" ON public.chart_of_accounts FOR ALL
  TO authenticated USING (public.user_has_permission('Finance') OR public.is_current_user_admin())
  WITH CHECK (public.user_has_permission('Finance') OR public.is_current_user_admin());

CREATE POLICY "Finance can manage cheques" ON public.cheques FOR ALL
  TO authenticated USING (public.user_has_permission('Finance') OR public.is_current_user_admin())
  WITH CHECK (public.user_has_permission('Finance') OR public.is_current_user_admin());

CREATE POLICY "Finance can manage invoices" ON public.invoices FOR ALL
  TO authenticated USING (public.user_has_permission('Finance') OR public.is_current_user_admin())
  WITH CHECK (public.user_has_permission('Finance') OR public.is_current_user_admin());

CREATE POLICY "Finance can manage journal_entries" ON public.journal_entries FOR ALL
  TO authenticated USING (public.user_has_permission('Finance') OR public.is_current_user_admin())
  WITH CHECK (public.user_has_permission('Finance') OR public.is_current_user_admin());

CREATE POLICY "Finance can manage journal_entry_lines" ON public.journal_entry_lines FOR ALL
  TO authenticated USING (public.user_has_permission('Finance') OR public.is_current_user_admin())
  WITH CHECK (public.user_has_permission('Finance') OR public.is_current_user_admin());

-- FIX 3: Replace USING(true) policies on loan/advance tables

-- loans
DROP POLICY IF EXISTS "Employees can view own loans" ON public.loans;
DROP POLICY IF EXISTS "Admins can update loans" ON public.loans;
DROP POLICY IF EXISTS "Authenticated users can insert loans" ON public.loans;

CREATE POLICY "Employees view own loans" ON public.loans FOR SELECT
  TO authenticated
  USING (employee_email = public.get_current_user_email() OR public.user_has_permission('Finance') OR public.is_current_user_admin());

CREATE POLICY "Finance can insert loans" ON public.loans FOR INSERT
  TO authenticated WITH CHECK (public.user_has_permission('Finance') OR public.is_current_user_admin());

CREATE POLICY "Finance can update loans" ON public.loans FOR UPDATE
  TO authenticated USING (public.user_has_permission('Finance') OR public.is_current_user_admin());

-- loan_repayments (no employee_email, join through loan_id)
DROP POLICY IF EXISTS "Users can view repayments" ON public.loan_repayments;
DROP POLICY IF EXISTS "System can insert repayments" ON public.loan_repayments;
DROP POLICY IF EXISTS "System can update repayments" ON public.loan_repayments;

CREATE POLICY "Users view own repayments" ON public.loan_repayments FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.loans WHERE loans.id = loan_repayments.loan_id AND loans.employee_email = public.get_current_user_email())
    OR public.user_has_permission('Finance')
    OR public.is_current_user_admin()
  );

CREATE POLICY "Finance can insert repayments" ON public.loan_repayments FOR INSERT
  TO authenticated WITH CHECK (public.user_has_permission('Finance') OR public.is_current_user_admin());

CREATE POLICY "Finance can update repayments" ON public.loan_repayments FOR UPDATE
  TO authenticated USING (public.user_has_permission('Finance') OR public.is_current_user_admin());

-- employee_salary_advances
DROP POLICY IF EXISTS "Users can view their own advances" ON public.employee_salary_advances;
DROP POLICY IF EXISTS "Admins can manage advances" ON public.employee_salary_advances;

CREATE POLICY "Employees view own advances" ON public.employee_salary_advances FOR SELECT
  TO authenticated
  USING (employee_email = public.get_current_user_email() OR public.user_has_permission('Finance') OR public.is_current_user_admin());

CREATE POLICY "Finance can manage advances" ON public.employee_salary_advances FOR ALL
  TO authenticated USING (public.user_has_permission('Finance') OR public.is_current_user_admin())
  WITH CHECK (public.user_has_permission('Finance') OR public.is_current_user_admin());

-- salary_advance_payments
DROP POLICY IF EXISTS "Users can view their own payments" ON public.salary_advance_payments;
DROP POLICY IF EXISTS "Admins can manage payments" ON public.salary_advance_payments;
DROP POLICY IF EXISTS "Users can create payment records" ON public.salary_advance_payments;

CREATE POLICY "Employees view own advance payments" ON public.salary_advance_payments FOR SELECT
  TO authenticated
  USING (employee_email = public.get_current_user_email() OR public.user_has_permission('Finance') OR public.is_current_user_admin());

CREATE POLICY "Finance can manage advance payments" ON public.salary_advance_payments FOR ALL
  TO authenticated USING (public.user_has_permission('Finance') OR public.is_current_user_admin())
  WITH CHECK (public.user_has_permission('Finance') OR public.is_current_user_admin());