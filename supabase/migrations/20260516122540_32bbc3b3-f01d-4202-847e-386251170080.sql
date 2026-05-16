
INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, metadata, created_at)
SELECT
  public.get_unified_user_id(oa.employee_email) AS user_id,
  'DEPOSIT' AS entry_type,
  ROUND(oa.total_amount)::numeric AS amount,
  'OT-AWARD-' || oa.id::text AS reference,
  jsonb_build_object(
    'description', 'Overtime reward (backfilled) — ref ' || oa.reference_number,
    'source', 'overtime_reward',
    'overtime_award_id', oa.id::text,
    'reference_number', oa.reference_number,
    'department', oa.department,
    'hours', oa.hours,
    'minutes', oa.minutes,
    'completed_at', oa.completed_at,
    'completed_by', oa.completed_by,
    'backfill', true
  ) AS metadata,
  COALESCE(oa.completed_at, now()) AS created_at
FROM public.overtime_awards oa
WHERE oa.status = 'completed'
  AND public.get_unified_user_id(oa.employee_email) IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.ledger_entries le
    WHERE le.metadata->>'overtime_award_id' = oa.id::text
       OR le.reference = 'OT-AWARD-' || oa.id::text
  );
