-- Realign Denis's recently-approved monthly loan to use 1st-of-month repayment dates
UPDATE public.loans
SET next_deduction_date = '2026-05-01'
WHERE id = '70a5e986-3f01-458d-8dca-c09398a2298e';

-- Realign that loan's pending installment due dates to the 1st of each subsequent month
-- Loan started 2026-04-27, duration 4 months → installments due 2026-05-01, 2026-06-01, 2026-07-01, 2026-08-01
UPDATE public.loan_repayments
SET due_date = (DATE '2026-05-01' + ((installment_number - 1) || ' months')::interval)::date
WHERE loan_id = '70a5e986-3f01-458d-8dca-c09398a2298e'
  AND status = 'pending';