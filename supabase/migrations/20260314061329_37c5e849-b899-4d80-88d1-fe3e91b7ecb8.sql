UPDATE public.loans 
SET remaining_balance = total_repayable - COALESCE(paid_amount, 0) 
WHERE id = 'dea04588-e818-4c39-83c7-9cca48c360c0';