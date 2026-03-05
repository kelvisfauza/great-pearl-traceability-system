-- Reschedule Benson's pending loan to flat interest
-- 80,000 × 10% × 2 months = 16,000 interest, total = 96,000, weekly = 12,000/wk (8 weeks)
UPDATE public.loans 
SET total_repayable = 96000, 
    weekly_installment = 12000, 
    remaining_balance = 96000,
    daily_interest_rate = 0.333
WHERE id = '34ce28a9-24bd-420e-8db6-9e08cebdd635';
