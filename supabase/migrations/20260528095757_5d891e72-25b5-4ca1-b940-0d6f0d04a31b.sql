-- Remove the earlier wallet credit (the deduction was actually correct after all)
DELETE FROM public.ledger_entries
WHERE reference = 'PAYROLL-CORRECTION-BENSON-MAY2026';

-- Restore both advances to paid_off (they really were recovered)
UPDATE public.employee_salary_advances
SET remaining_balance = 0, status = 'paid_off', updated_at = now()
WHERE id IN (
  'f6ffdca2-0618-42e8-82ba-025d2e47df92',
  '7c0d7ea7-4206-4daa-8d13-58f9391f26c1'
);
