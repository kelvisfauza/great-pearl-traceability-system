-- 1. Remove premature March 2026 salary wallet credits
DELETE FROM public.ledger_entries WHERE reference LIKE 'SAL-MAR26%';

-- 2. Remove March 2026 salary payment records so 27th run processes fresh
DELETE FROM public.employee_salary_payments WHERE payment_month = 'March 2026' AND status = 'completed';

-- 3. Remove March advance payment records created by auto-run
DELETE FROM public.salary_advance_payments 
WHERE approved_by = 'Auto-Salary System' 
AND created_at >= '2026-03-12 09:00:00';

-- 4. Reset Timothy's advance to 120k (pre-March state: 200k - 40k Jan - 40k Feb)
UPDATE public.employee_salary_advances 
SET remaining_balance = 120000, status = 'active', updated_at = now()
WHERE id = '6f94afa4-6c92-4dac-a730-90f97812dd66';

-- 5. Benson's 60k advance stays paid_off at 0 (he cleared it before March per user confirmation)