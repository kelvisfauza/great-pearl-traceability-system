-- Fix installment 2: restore to fully paid 12,000
UPDATE public.loan_repayments
SET amount_paid = 12000,
    deducted_from = 'Prior payments: UGX 7,000; Wallet: UGX 859; Guarantor: UGX 1,141 (3,000 refunded to guarantor, covered by borrower advance)',
    updated_at = now()
WHERE id = 'e1c89553-4f7b-4647-8d8a-bf650db22477';

-- Restore loan totals: Benson paid the full 24,000 (2 installments)
UPDATE public.loans
SET paid_amount = 24000,
    remaining_balance = 72000,
    updated_at = now()
WHERE id = '34ce28a9-24bd-420e-8db6-9e08cebdd635';