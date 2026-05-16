
-- Reverse the backfill credits — they were paid manually outside the system
DELETE FROM public.ledger_entries
WHERE reference IN (
  'OT-cf13cf70-1778490186946',
  'OT-8034f149-1778489890359',
  'OT-c70f7ec6-1778489598152'
)
AND (metadata->>'backfill')::boolean IS TRUE;

-- Reset the review payout state so nothing thinks it was wallet-paid
UPDATE public.monthly_overtime_reviews
SET payout_status = 'pending',
    paid_at = NULL,
    payout_method = NULL,
    payout_destination = NULL,
    payout_reference = NULL
WHERE id IN (
  'cf13cf70-9ce1-4243-a8cc-e80a5af76fe4',
  '8034f149-c03d-46bd-ab65-9ad5ab820e0e',
  'c70f7ec6-0285-47eb-ab29-ecd110f05ab4'
);
