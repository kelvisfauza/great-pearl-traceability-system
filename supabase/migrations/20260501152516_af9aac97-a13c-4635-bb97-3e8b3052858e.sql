-- Mark withdrawal as declined
UPDATE public.instant_withdrawals
SET payout_status = 'declined', completed_at = now()
WHERE id = 'b5bb1720-7daa-4141-8529-40b804b07092';

-- Refund to wallet via DEPOSIT
INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, metadata, created_at)
VALUES (
  '24edb593-8527-4ced-8225-f5df0d209ccf',
  'DEPOSIT',
  95000,
  'REFUND-INSTANT-WD-b5bb1720-7daa-4141-8529-40b804b07092',
  jsonb_build_object(
    'description', 'Refund for declined instant withdrawal of UGX 95,000 (admin reversal)',
    'source', 'admin_refund',
    'original_withdrawal_id', 'b5bb1720-7daa-4141-8529-40b804b07092',
    'refunded_by', 'fauzakusa@greatpearlcoffee.com'
  ),
  now()
);