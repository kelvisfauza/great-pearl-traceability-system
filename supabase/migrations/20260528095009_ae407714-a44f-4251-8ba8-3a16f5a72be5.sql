-- Reverse incorrect May 2026 payroll advance deduction for Bwambale Benson
INSERT INTO public.ledger_entries (user_id, entry_type, amount, source_category, reference, metadata)
VALUES (
  'eba97d3e-f098-467a-ad78-d0b9639d76a8',
  'DEPOSIT',
  93883,
  'SYSTEM_AWARD',
  'PAYROLL-CORRECTION-BENSON-MAY2026',
  jsonb_build_object(
    'description', 'Payroll correction – reversal of May 2026 advance deduction (UGX 93,883). Yo remittance cancelled; corrected payout handled manually.',
    'related_salary_ref', 'SAL-2398dfe4-411d-4549-8f1c-49922eca8761',
    'corrected_net', 190000
  )
);

-- Revert the two advances back to outstanding so they remain collectable
UPDATE public.employee_salary_advances
SET remaining_balance = 50000, status = 'active', updated_at = now()
WHERE id = 'f6ffdca2-0618-42e8-82ba-025d2e47df92';

UPDATE public.employee_salary_advances
SET remaining_balance = 43883, status = 'active', updated_at = now()
WHERE id = '7c0d7ea7-4206-4daa-8d13-58f9391f26c1';
