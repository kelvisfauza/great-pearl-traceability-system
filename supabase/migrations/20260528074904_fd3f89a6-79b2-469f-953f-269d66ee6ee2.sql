
-- 1) Reversal credit for the wrongful wallet deduction
INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, metadata)
VALUES (
  '7cdf79bf-c024-4107-98a7-3d84dbf0e975',
  'REVERSAL',
  150000,
  'LOAN-REPAY-REVERSAL-70a5e986-1',
  jsonb_build_object(
    'description', 'Reversal of wrongful wallet sweep for loan installment #1 (over-counted airtime/data allowances as cash).',
    'source', 'admin_correction',
    'loan_id', '70a5e986-3f01-458d-8dca-c09398a2298e',
    'installment', 1,
    'original_ledger_id', '2721edb8-3ca6-4b2a-b5c0-9b578744d4b0',
    'bypass_treasury_check', true
  )
);

-- 2) Reset installment #1 to pending so the corrected cascade can re-collect
UPDATE public.loan_repayments
SET amount_paid = 0,
    paid_date = NULL,
    status = 'pending',
    deducted_from = NULL,
    payment_reference = NULL
WHERE id = 'aa912efe-eaf8-4ca8-9095-452d5a13889c';
