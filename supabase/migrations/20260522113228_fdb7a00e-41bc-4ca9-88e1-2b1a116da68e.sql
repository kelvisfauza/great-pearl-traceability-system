
-- Refund Sserunkuma Taufiq for declined instant withdrawal (UGX 87,000)
INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, source_category, metadata)
SELECT '5ac019de-199c-4a3f-97de-96de786f55dc', 'DEPOSIT', 87000,
       'REFUND-INSTANT-WD-b1e671ac-a115-4857-94e8-e4e44bd9247a',
       'SYSTEM_AWARD',
       jsonb_build_object(
         'type','instant_withdrawal_refund',
         'original_ref','INSTANT-WD-1779448508014',
         'reason','Declined at Yo Payments - manual refund by admin',
         'description','Instant withdrawal refund - declined by Yo Payments'
       )
WHERE NOT EXISTS (
  SELECT 1 FROM public.ledger_entries
  WHERE reference = 'REFUND-INSTANT-WD-b1e671ac-a115-4857-94e8-e4e44bd9247a'
);

-- Mark the pending instant withdrawal as failed
UPDATE public.instant_withdrawals
SET payout_status = 'failed',
    completed_at = now()
WHERE id = 'b1e671ac-a115-4857-94e8-e4e44bd9247a'
  AND payout_status = 'pending_approval';
