UPDATE public.loans
SET next_deduction_date = '2026-05-27'
WHERE id = '70a5e986-3f01-458d-8dca-c09398a2298e';

UPDATE public.loan_repayments
SET due_date = (DATE '2026-05-27' + ((installment_number - 1) || ' months')::interval)::date
WHERE loan_id = '70a5e986-3f01-458d-8dca-c09398a2298e'
  AND status = 'pending';