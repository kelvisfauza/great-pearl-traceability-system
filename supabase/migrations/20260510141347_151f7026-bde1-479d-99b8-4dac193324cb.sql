INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, metadata)
VALUES
  ('eba97d3e-f098-467a-ad78-d0b9639d76a8', 'WITHDRAWAL', -22246,
   'LOAN-REPAY-728a0b80-a0ab-427d-b0de-e108e8d0d6ad-1',
   jsonb_build_object(
     'loan_id', '728a0b80-a0ab-427d-b0de-e108e8d0d6ad',
     'installment', 1,
     'source', 'wallet',
     'penalty_included', 0,
     'bypass_treasury_check', true,
     'description', 'Loan repayment installment 1 (retroactive backfill – original cron blocked by treasury trigger)',
     'backfilled_by', 'admin_data_repair',
     'backfilled_at', now()::text
   )),
  ('e4c10711-43e4-4901-9b2a-6f2a5a836240', 'ADJUSTMENT', -10538,
   'LOAN-GUARANTOR-728a0b80-a0ab-427d-b0de-e108e8d0d6ad-1',
   jsonb_build_object(
     'loan_id', '728a0b80-a0ab-427d-b0de-e108e8d0d6ad',
     'installment', 1,
     'borrower', 'bwambalebenson@greatpearlcoffee.com',
     'source', 'guarantor',
     'bypass_treasury_check', true,
     'description', 'Guarantor recovery for Bwambale Benson''s loan (retroactive backfill – original cron blocked by treasury trigger)',
     'backfilled_by', 'admin_data_repair',
     'backfilled_at', now()::text
   ));