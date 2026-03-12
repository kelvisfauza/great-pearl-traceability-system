
-- Fix Benson's loan repayment: wallet was deducted but loan tables not updated
-- Ledger entry fd6eac01 shows -12000 WITHDRAWAL at 2026-03-12 06:45:09

-- Update loan remaining balance and paid amount
UPDATE loans 
SET remaining_balance = remaining_balance - 12000, 
    paid_amount = COALESCE(paid_amount, 0) + 12000,
    updated_at = now()
WHERE id = '34ce28a9-24bd-420e-8db6-9e08cebdd635';

-- Mark installment #1 (due today 2026-03-12) as paid
UPDATE loan_repayments 
SET amount_paid = 12000, 
    status = 'paid', 
    paid_date = '2026-03-12',
    deducted_from = 'wallet',
    payment_reference = 'LOANREPAY-ADMIN-34ce28a9-1773244751671',
    updated_at = now()
WHERE id = '08ecdc33-331d-4e20-80ea-ef02f4576cb5';
