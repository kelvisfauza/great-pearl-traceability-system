
DO $$
DECLARE
  r record;
  v_last_balance numeric;
BEGIN
  FOR r IN
    SELECT account_id, user_id, SUM(amount) AS total, COUNT(*) AS cnt
    FROM public.overdraft_transactions
    WHERE created_at::date = '2026-06-06'
      AND transaction_type = 'recovery'
    GROUP BY account_id, user_id
    HAVING COUNT(*) > 1
  LOOP
    SELECT balance_after INTO v_last_balance
    FROM public.overdraft_transactions
    WHERE account_id = r.account_id
      AND created_at::date = '2026-06-06'
      AND transaction_type = 'recovery'
    ORDER BY created_at ASC, balance_after ASC
    LIMIT 1;

    DELETE FROM public.overdraft_transactions
    WHERE account_id = r.account_id
      AND created_at::date = '2026-06-06'
      AND transaction_type = 'recovery';

    INSERT INTO public.overdraft_transactions
      (account_id, user_id, transaction_type, amount, balance_after, reference, metadata, created_at)
    VALUES (
      r.account_id,
      r.user_id,
      'recovery',
      r.total,
      COALESCE(v_last_balance, 0),
      'OD-REC-CONSOLIDATED-' || r.account_id::text || '-20260606',
      jsonb_build_object(
        'description', 'Overdraft repayment from incoming credit (consolidated)',
        'source', 'CONSOLIDATED',
        'consolidated_count', r.cnt
      ),
      now()
    );
  END LOOP;
END $$;
