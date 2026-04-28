-- Restore Kusa Fauza milling balance for testing
UPDATE public.milling_customers 
SET current_balance = 20000, status = 'active' 
WHERE id = 'ff540425-4681-42f3-816a-2d567d8147fc';

-- Create a test active loan for Fauza Kusa 2 so USSD repayment can be tested
INSERT INTO public.loans (
  employee_id, employee_name, employee_email, employee_phone,
  loan_amount, interest_rate, total_repayable, duration_months,
  monthly_installment, disbursed_amount, paid_amount, remaining_balance,
  status, admin_approved, guarantor_approved,
  start_date, end_date, next_deduction_date, loan_type
)
SELECT 
  e.id, 'Fauza Kusa 2', 'fauzakusa@greatpearlcoffee.com', '256781121639',
  50000, 5, 52500, 1,
  52500, 50000, 0, 52500,
  'disbursed', true, true,
  CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', CURRENT_DATE + INTERVAL '30 days', 'monthly'
FROM public.employees e 
WHERE e.email = 'fauzakusa@greatpearlcoffee.com'
LIMIT 1;