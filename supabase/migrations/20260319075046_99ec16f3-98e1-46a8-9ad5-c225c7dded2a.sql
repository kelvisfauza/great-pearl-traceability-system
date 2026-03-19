-- Insert refund ledger entry for guarantor (Tumwine Alex)
INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, metadata)
VALUES (
  '8b590bb1-6cda-47af-96e1-0c35d628a01c',
  'ADJUSTMENT',
  3000,
  'REFUND-GUARANTOR-34ce28a9-24bd-420e-8db6-9e08cebdd635-2-' || extract(epoch from now())::text,
  jsonb_build_object(
    'source', 'admin_refund',
    'loan_id', '34ce28a9-24bd-420e-8db6-9e08cebdd635',
    'installment', 2,
    'borrower', 'bwambalebenson@greatpearlcoffee.com',
    'description', 'Refund: overcharged guarantor recovery for Bwambale Benson loan installment 2',
    'refund_amount', 3000,
    'original_deduction_ref', 'LOAN-GUARANTOR-34ce28a9-24bd-420e-8db6-9e08cebdd635-2'
  )
);

-- Adjust Benson's loan: add 3,000 back to remaining balance since guarantor refund reduces total collected
UPDATE public.loans 
SET remaining_balance = remaining_balance + 3000,
    paid_amount = paid_amount - 3000,
    updated_at = now()
WHERE id = '34ce28a9-24bd-420e-8db6-9e08cebdd635';

-- Fix installment 2 deducted_from to reflect correct amounts
UPDATE public.loan_repayments
SET deducted_from = 'Prior payments: UGX 7,000; Wallet: UGX 859; Guarantor: UGX 1,141 (3,000 refunded)',
    amount_paid = 9000,
    updated_at = now()
WHERE id = 'e1c89553-4f7b-4647-8d8a-bf650db22477';