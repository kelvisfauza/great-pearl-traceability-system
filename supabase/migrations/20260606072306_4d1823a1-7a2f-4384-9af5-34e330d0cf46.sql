
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT user_id, SUM(amount) AS total, COUNT(*) AS cnt
    FROM public.ledger_entries
    WHERE source_category = 'OVERDRAFT_RECOVERY'
      AND created_at::date = '2026-06-06'
      AND metadata->>'source' = 'REPLAY'
    GROUP BY user_id
    HAVING COUNT(*) > 1
  LOOP
    DELETE FROM public.ledger_entries
    WHERE source_category = 'OVERDRAFT_RECOVERY'
      AND created_at::date = '2026-06-06'
      AND metadata->>'source' = 'REPLAY'
      AND user_id = r.user_id;

    INSERT INTO public.ledger_entries (user_id, entry_type, amount, source_category, reference, metadata, created_at)
    VALUES (
      r.user_id,
      'WITHDRAWAL',
      r.total,
      'OVERDRAFT_RECOVERY',
      'OD-REC-CONSOLIDATED-' || r.user_id::text || '-20260606',
      jsonb_build_object(
        'description', 'Overdraft repayment from incoming credit (consolidated)',
        'type', 'overdraft_recovery',
        'source', 'CONSOLIDATED',
        'consolidated_count', r.cnt,
        'bypass_treasury_check', true
      ),
      now()
    );
  END LOOP;
END $$;
