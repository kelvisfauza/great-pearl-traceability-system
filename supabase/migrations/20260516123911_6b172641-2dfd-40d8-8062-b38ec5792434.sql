
-- Credit the 3 April 2026 overtime reviews that were approved by HR but never had
-- the payout triggered (status=approved, payout_status=pending, no ledger entry).
-- Uses the same OT-<short-review-id>-<timestamp-ms> reference pattern as
-- process-overtime-payout so it's traceable and idempotent.

WITH targets AS (
  SELECT * FROM (VALUES
    ('cf13cf70-9ce1-4243-a8cc-e80a5af76fe4'::uuid, 'EMP008',                                36000, 'OT-cf13cf70-1778490186946'),
    ('8034f149-c03d-46bd-ab65-9ad5ab820e0e'::uuid, 'kahindodaphne@greatpearlcoffee.com',    93000, 'OT-8034f149-1778489890359'),
    ('c70f7ec6-0285-47eb-ab29-ecd110f05ab4'::uuid, 'EMP006',                                70500, 'OT-c70f7ec6-1778489598152')
  ) AS t(review_id, employee_email, amount, payout_ref)
),
resolved AS (
  SELECT
    t.*,
    COALESCE(
      public.get_unified_user_id(t.employee_email),
      (SELECT auth_user_id::text FROM public.employees WHERE email = t.employee_email LIMIT 1),
      (SELECT id::text       FROM public.employees WHERE email = t.employee_email LIMIT 1)
    ) AS user_id
  FROM targets t
),
inserted AS (
  INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, source_category, metadata)
  SELECT
    r.user_id,
    'DEPOSIT',
    r.amount,
    r.payout_ref,
    'SYSTEM_AWARD',
    jsonb_build_object(
      'source','overtime_reward',
      'month',4,
      'year',2026,
      'review_id',r.review_id,
      'description','Overtime reward — April 2026',
      'bypass_treasury_check',true,
      'backfill',true,
      'backfill_reason','Approved April 2026 overtime payout never triggered'
    )
  FROM resolved r
  WHERE r.user_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.ledger_entries le WHERE le.reference = r.payout_ref)
  RETURNING reference
)
UPDATE public.monthly_overtime_reviews mor
SET payout_status = 'paid',
    paid_at = COALESCE(mor.paid_at, now()),
    payout_method = COALESCE(mor.payout_method, 'wallet'),
    payout_destination = COALESCE(mor.payout_destination, 'wallet'),
    payout_reference = COALESCE(mor.payout_reference, t.payout_ref)
FROM (SELECT * FROM (VALUES
    ('cf13cf70-9ce1-4243-a8cc-e80a5af76fe4'::uuid, 'OT-cf13cf70-1778490186946'),
    ('8034f149-c03d-46bd-ab65-9ad5ab820e0e'::uuid, 'OT-8034f149-1778489890359'),
    ('c70f7ec6-0285-47eb-ab29-ecd110f05ab4'::uuid, 'OT-c70f7ec6-1778489598152')
  ) AS x(review_id, payout_ref)) t
WHERE mor.id = t.review_id;
