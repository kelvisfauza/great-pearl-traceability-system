-- Fix Benson's installment #2: recovery happened via ledger but repayment record wasn't updated
UPDATE loan_repayments 
SET amount_paid = 12000, 
    status = 'paid', 
    paid_date = '2026-03-19',
    deducted_from = 'Wallet Repayment; Wallet: UGX 859; Guarantor: UGX 4,141',
    payment_reference = 'AUTO-2026-03-19'
WHERE id = 'e1c89553-4f7b-4647-8d8a-bf650db22477';

-- Update loan paid_amount and remaining_balance
UPDATE loans 
SET paid_amount = 24000,
    remaining_balance = 72000
WHERE id = '34ce28a9-24bd-420e-8db6-9e08cebdd635';