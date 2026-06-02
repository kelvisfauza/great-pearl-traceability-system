-- Backfill John Masereka's loan 0b320e54 installment schedule
-- Wallet ledger confirms 55,000 paid; redistribute to match.
UPDATE public.loan_repayments
SET amount_paid = 17250,
    status = 'paid',
    paid_date = COALESCE(paid_date, '2026-05-25'),
    deducted_from = 'Wallet Repayment (backfill reconciliation)'
WHERE id = 'ce685df4-dee7-420a-b1bd-0cdfa08b1837';

UPDATE public.loan_repayments
SET amount_paid = 3250,
    status = 'pending',
    deducted_from = 'Wallet Repayment (backfill surplus)'
WHERE id = '91ec350b-c061-4b6e-baeb-67b328a01064';
