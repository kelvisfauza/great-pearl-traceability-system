
-- Fix Benson's 3 missing wallet repayments from today

-- 1. Loan fc46f1a6 (long-term 150K): paid UGX 12,000
UPDATE loans SET 
  paid_amount = COALESCE(paid_amount, 0) + 12000,
  remaining_balance = GREATEST(0, remaining_balance - 12000)
WHERE id = 'fc46f1a6-51e5-4189-8fc8-cc7149d71049';

UPDATE loan_repayments SET
  amount_paid = 12000,
  status = CASE WHEN amount_due <= 12000 THEN 'paid' ELSE 'partial' END,
  paid_date = '2026-03-27',
  payment_reference = 'LOANREPAY-WALLET-fc46f1a6-1774602431258',
  deducted_from = 'Wallet Repayment'
WHERE loan_id = 'fc46f1a6-51e5-4189-8fc8-cc7149d71049'
  AND installment_number = 1
  AND status IN ('pending', 'overdue');

-- 2. Loan 34ce28a9 (quick 80K): paid UGX 12,000 - installment 4
UPDATE loans SET 
  paid_amount = COALESCE(paid_amount, 0) + 12000,
  remaining_balance = GREATEST(0, remaining_balance - 12000)
WHERE id = '34ce28a9-24bd-420e-8db6-9e08cebdd635';

UPDATE loan_repayments SET
  amount_paid = 12000,
  status = 'paid',
  paid_date = '2026-03-27',
  payment_reference = 'LOANREPAY-WALLET-34ce28a9-1774602592801',
  deducted_from = 'Wallet Repayment'
WHERE loan_id = '34ce28a9-24bd-420e-8db6-9e08cebdd635'
  AND installment_number = 4
  AND status IN ('pending', 'overdue');

-- 3. Loan 092cc107 (quick 100K): paid UGX 10,000
UPDATE loans SET 
  paid_amount = COALESCE(paid_amount, 0) + 10000,
  remaining_balance = GREATEST(0, remaining_balance - 10000)
WHERE id = '092cc107-9870-489b-a73d-8236727f753d';

UPDATE loan_repayments SET
  amount_paid = 10000,
  status = CASE WHEN amount_due <= 10000 THEN 'paid' ELSE 'partial' END,
  paid_date = '2026-03-27',
  payment_reference = 'LOANREPAY-WALLET-092cc107-1774602662268',
  deducted_from = 'Wallet Repayment'
WHERE loan_id = '092cc107-9870-489b-a73d-8236727f753d'
  AND installment_number = 1
  AND status IN ('pending', 'overdue');

-- 4. Allow employees to update their own loans (for wallet repayments)
CREATE POLICY "Employees can update own loans"
ON loans FOR UPDATE
TO authenticated
USING (employee_email = get_current_user_email())
WITH CHECK (employee_email = get_current_user_email());

-- 5. Allow employees to update repayments on their own loans
CREATE POLICY "Employees can update own repayments"
ON loan_repayments FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM loans WHERE loans.id = loan_repayments.loan_id AND loans.employee_email = get_current_user_email()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM loans WHERE loans.id = loan_repayments.loan_id AND loans.employee_email = get_current_user_email()
));
