
-- Fix Benson's 3,000 UGX payment that was deducted from wallet but not applied to installment
-- Apply the 3,000 to installment #2 (currently has 4,000 paid)
UPDATE loan_repayments 
SET amount_paid = 7000
WHERE id = 'e1c89553-4f7b-4647-8d8a-bf650db22477'
AND loan_id = '34ce28a9-24bd-420e-8db6-9e08cebdd635';

-- Recalculate remaining_balance: total_repayable (96,000) - paid_amount (19,000) = 77,000
UPDATE loans 
SET remaining_balance = total_repayable - paid_amount
WHERE id = '34ce28a9-24bd-420e-8db6-9e08cebdd635';
