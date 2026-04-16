
-- Fix: move 60K payment from installment 2 to installment 1 (payments should apply to earliest installment first)
-- Installment 1: 12,000 + 60,000 = 72,000 paid of 82,500
UPDATE loan_repayments 
SET amount_paid = 72000, status = 'partial'
WHERE id = '80ebe1a2-5c04-4e1a-996e-f04bc4ab427c';

-- Installment 2: reset to 0 paid
UPDATE loan_repayments 
SET amount_paid = 0, status = 'pending', paid_date = NULL
WHERE id = 'be870303-44f1-4c51-9c7c-0575233e8a09';
