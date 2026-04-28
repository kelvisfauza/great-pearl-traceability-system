
-- 1) Finance-approve the request
UPDATE public.approval_requests
SET finance_approved = true,
    finance_approved_by = 'system (manual disbursement on user instruction)',
    finance_approved_at = now(),
    approval_stage = 'approved',
    status = 'Approved',
    approval_notes = COALESCE(approval_notes, '') || E'\nFinance approval recorded by admin instruction; UGX 50,000 disbursed to wallet.',
    updated_at = now()
WHERE id = 'db9fc0fa-0390-4181-a331-14bd4842c2e8';

-- 2) Create the salary advance recovery record so the 27th payroll cron deducts it
INSERT INTO public.employee_salary_advances (
  employee_email, employee_name, original_amount, remaining_balance,
  minimum_payment, reason, status, created_by
)
VALUES (
  'tatwanzire@greatpearlcoffee.com',
  'Artwanzire Timothy',
  50000, 50000, 50000,
  'Salary Advance (Apr 28 — approved by Bwambale Denis & Finance)',
  'active',
  'fauzakusa@greatpearlcoffee.com'
);

-- 3) Credit the wallet via paired ledger entry (DEPOSIT)
INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, metadata)
VALUES (
  '010f057a-92e3-479d-89b2-a801ef851949',
  'DEPOSIT',
  50000,
  'SALARY-ADVANCE-APPROVED-db9fc0fa',
  jsonb_build_object(
    'description', 'Salary Advance Disbursement - Approved (UGX 50,000)',
    'employee_name', 'Artwanzire Timothy',
    'source', 'salary_advance',
    'source_category', 'LOAN_DISBURSEMENT',
    'approval_id', 'db9fc0fa-0390-4181-a331-14bd4842c2e8',
    'admin_approved_by', 'bwambale denis',
    'finance_approved_by', 'system (manual on user instruction)',
    'recovery_on', '27th payroll cron'
  )
);
