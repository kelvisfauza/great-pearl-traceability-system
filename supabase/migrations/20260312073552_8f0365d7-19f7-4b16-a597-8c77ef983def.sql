-- Fix remaining_balance: total_repayable(96000) - paid_amount(12000) = 84000
UPDATE loans 
SET remaining_balance = 84000, 
    updated_at = now() 
WHERE id = '34ce28a9-24bd-420e-8db6-9e08cebdd635';