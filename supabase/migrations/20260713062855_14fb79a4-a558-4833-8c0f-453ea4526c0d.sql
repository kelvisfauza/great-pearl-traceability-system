DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT id, user_id, reference, metadata
    FROM public.ledger_entries
    WHERE reference LIKE 'OD-DRAW-%'
      AND created_at >= '2026-07-13 06:00:00+00'
      AND created_at < '2026-07-13 07:00:00+00'
  LOOP
    INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, source_category, metadata)
    VALUES (
      rec.user_id, 'REVERSAL', -5000, 'REV-' || rec.reference, 'OTHER',
      jsonb_build_object(
        'type', 'overdraft_draw_reversal',
        'bypass_treasury_check', true,
        'reversed_reference', rec.reference,
        'reason', 'System erroneously auto-drew overdraft during Monday late deduction despite sufficient wallet balance',
        'description', 'Reversal of spurious overdraft draw of UGX 5,000'
      )
    );
  END LOOP;

  DELETE FROM public.treasury_pool_entries
  WHERE reference LIKE 'OD-DRAW-%'
    AND created_at >= '2026-07-13 06:00:00+00'
    AND created_at < '2026-07-13 07:00:00+00';

  UPDATE public.overdraft_accounts oa
  SET outstanding_balance = GREATEST(0, outstanding_balance - (d.draws * 5137.5)),
      total_drawn = GREATEST(0, total_drawn - (d.draws * 5000)),
      updated_at = now()
  FROM (
    SELECT user_id, COUNT(*)::int AS draws
    FROM public.ledger_entries
    WHERE reference LIKE 'OD-DRAW-%'
      AND created_at >= '2026-07-13 06:00:00+00'
      AND created_at < '2026-07-13 07:00:00+00'
    GROUP BY user_id
  ) d
  WHERE oa.user_id::text = d.user_id::text AND oa.status = 'active';
END $$;