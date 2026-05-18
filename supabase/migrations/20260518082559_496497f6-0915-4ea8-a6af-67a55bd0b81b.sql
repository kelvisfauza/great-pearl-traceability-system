-- System balance adjustment 2026-05-18: reconcile user wallet balances to operator-specified totals
DO $$
DECLARE
  r RECORD;
  cur_bal NUMERIC;
  delta NUMERIC;
  ref_txt TEXT;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('ff2f07a4-ef00-4f1c-9316-498ddfd38038'::text, 26402::numeric, 'Mukobi Godwin'),
      ('1922048f-c0b9-422e-9b42-47713a75c1ca', 10864, 'John Masereka'),
      ('13112b82-bfe6-4629-93ee-522b099318a9', 15111, 'Musema Wyclif'),
      ('010f057a-92e3-479d-89b2-a801ef851949', 263873, 'Artwanzire Timothy'),
      ('24edb593-8527-4ced-8225-f5df0d209ccf', 45695, 'Kibaba Nicholus'),
      ('eba97d3e-f098-467a-ad78-d0b9639d76a8', 11031, 'Bwambale Benson'),
      ('5ac019de-199c-4a3f-97de-96de786f55dc', 27004, 'Sserunkuma Taufiq'),
      ('60fa7376-53ee-4804-9b6c-0eefccd3fc9c', 352747, 'Morjalia Jadens'),
      ('8b590bb1-6cda-47af-96e1-0c35d628a01c', 137895, 'Tumwine Alex')
    ) AS t(uid, target, label)
  LOOP
    ref_txt := 'SYS-ADJ-2026-05-18-' || r.uid;
    -- Skip if already applied
    IF EXISTS (SELECT 1 FROM public.ledger_entries WHERE reference = ref_txt) THEN
      CONTINUE;
    END IF;

    SELECT COALESCE(SUM(amount),0) INTO cur_bal
    FROM public.ledger_entries
    WHERE user_id = r.uid
      AND entry_type IN ('LOYALTY_REWARD','BONUS','DEPOSIT','WITHDRAWAL','ADJUSTMENT','MONTHLY_SALARY','ADVANCE_RECOVERY','LOAN_DISBURSEMENT','LOAN_REPAYMENT','LOAN_RECOVERY')
      AND NOT (COALESCE(metadata->>'allowance_type','') IN ('airtime_allowance','data_allowance') AND entry_type IN ('DEPOSIT','PAYOUT'));

    delta := r.target - cur_bal;

    IF delta = 0 THEN
      CONTINUE;
    END IF;

    INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, source_category, metadata)
    VALUES (
      r.uid,
      'ADJUSTMENT',
      delta,
      ref_txt,
      'SYSTEM_AWARD',
      jsonb_build_object(
        'description', 'System balance adjustment (reconciliation) for ' || r.label,
        'reason', 'Operator-directed reconciliation of wallet balance',
        'target_balance', r.target,
        'previous_balance', cur_bal,
        'adjusted_by', 'system_admin',
        'adjusted_at', now(),
        'bypass_treasury_check', true,
        'type', 'internal_correction'
      )
    );
  END LOOP;
END $$;