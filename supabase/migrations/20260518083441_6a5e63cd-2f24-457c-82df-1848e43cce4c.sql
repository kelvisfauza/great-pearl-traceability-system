-- Reconcile 9 wallets to exact target balances across ALL views (raw + effective)
-- Step 1: For each user, reverse phantom airtime_allowance / data_allowance DEPOSIT/PAYOUT entries
-- Step 2: Insert a single final reconciliation ADJUSTMENT so total = target

DO $$
DECLARE
  r RECORD;
  v_phantom_sum NUMERIC;
  v_phantom_ref TEXT;
  v_phantom_reversal_total NUMERIC;
  v_current_raw NUMERIC;
  v_final_ref TEXT;
  v_correction NUMERIC;
  targets RECORD;
BEGIN
  FOR targets IN
    SELECT * FROM (VALUES
      ('ff2f07a4-ef00-4f1c-9316-498ddfd38038'::text, 26402::numeric),  -- Godwin
      ('1922048f-c0b9-422e-9b42-47713a75c1ca', 10864),                   -- John
      ('13112b82-bfe6-4629-93ee-522b099318a9', 15111),                   -- Wyclif
      ('010f057a-92e3-479d-89b2-a801ef851949', 263873),                  -- Timothy
      ('24edb593-8527-4ced-8225-f5df0d209ccf', 45695),                   -- Kibaba
      ('eba97d3e-f098-467a-ad78-d0b9639d76a8', 11031),                   -- Benson
      ('5ac019de-199c-4a3f-97de-96de786f55dc', 27004),                   -- Sserunkuma
      ('60fa7376-53ee-4804-9b6c-0eefccd3fc9c', 352747),                  -- Morjalia
      ('8b590bb1-6cda-47af-96e1-0c35d628a01c', 137895)                   -- Tumwine Alex
    ) AS t(user_id, target_balance)
  LOOP
    -- Step 1: Reverse phantom airtime/data DEPOSIT or PAYOUT entries (idempotent via reference)
    v_phantom_reversal_total := 0;
    FOR r IN
      SELECT id, amount
      FROM public.ledger_entries
      WHERE user_id = targets.user_id
        AND entry_type IN ('DEPOSIT','PAYOUT')
        AND (metadata->>'allowance_type') IN ('airtime_allowance','data_allowance')
    LOOP
      v_phantom_ref := 'PHANTOM-REV-' || r.id::text;
      IF NOT EXISTS (SELECT 1 FROM public.ledger_entries WHERE reference = v_phantom_ref) THEN
        INSERT INTO public.ledger_entries (user_id, entry_type, source_category, amount, reference, metadata)
        VALUES (
          targets.user_id,
          'ADJUSTMENT',
          'SYSTEM_AWARD',
          -r.amount,
          v_phantom_ref,
          jsonb_build_object(
            'description', 'Reversal of phantom airtime/data wallet credit (not real wallet funds)',
            'type', 'phantom_reversal',
            'reverses_entry', r.id,
            'bypass_treasury_check', true
          )
        );
        v_phantom_reversal_total := v_phantom_reversal_total + (-r.amount);
      END IF;
    END LOOP;

    -- Step 2: Insert (or update) the final reconciliation entry so raw sum exactly equals target
    v_final_ref := 'FINAL-RECONCILE-2026-05-18-' || targets.user_id;

    -- Remove any previous FINAL-RECONCILE for this user so we can re-stamp
    DELETE FROM public.ledger_entries WHERE reference = v_final_ref;

    SELECT COALESCE(SUM(amount),0) INTO v_current_raw
    FROM public.ledger_entries WHERE user_id = targets.user_id;

    v_correction := targets.target_balance - v_current_raw;

    IF v_correction <> 0 THEN
      INSERT INTO public.ledger_entries (user_id, entry_type, source_category, amount, reference, metadata)
      VALUES (
        targets.user_id,
        'ADJUSTMENT',
        'SYSTEM_AWARD',
        v_correction,
        v_final_ref,
        jsonb_build_object(
          'description', 'Final system reconciliation — wallet balance set to verified amount',
          'type', 'final_reconciliation',
          'target_balance', targets.target_balance,
          'bypass_treasury_check', true
        )
      );
    END IF;
  END LOOP;
END $$;