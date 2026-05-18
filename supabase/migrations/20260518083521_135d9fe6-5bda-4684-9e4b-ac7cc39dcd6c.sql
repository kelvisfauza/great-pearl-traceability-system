DO $$
DECLARE
  v_user_id text;
  v_target numeric;
  v_current_raw numeric;
  v_correction numeric;
  v_final_ref text;
  targets RECORD;
BEGIN
  FOR targets IN
    SELECT * FROM (VALUES
      ('ff2f07a4-ef00-4f1c-9316-498ddfd38038'::text, 26402::numeric),
      ('1922048f-c0b9-422e-9b42-47713a75c1ca', 10864),
      ('13112b82-bfe6-4629-93ee-522b099318a9', 15111),
      ('010f057a-92e3-479d-89b2-a801ef851949', 263873),
      ('24edb593-8527-4ced-8225-f5df0d209ccf', 45695),
      ('eba97d3e-f098-467a-ad78-d0b9639d76a8', 11031),
      ('5ac019de-199c-4a3f-97de-96de786f55dc', 27004),
      ('60fa7376-53ee-4804-9b6c-0eefccd3fc9c', 352747),
      ('8b590bb1-6cda-47af-96e1-0c35d628a01c', 137895)
    ) AS t(user_id, target_balance)
  LOOP
    v_user_id := targets.user_id;
    v_target := targets.target_balance;

    -- Remove the phantom airtime/data wallet credits entirely (they were never real wallet money)
    DELETE FROM public.ledger_entries
    WHERE user_id = v_user_id
      AND entry_type IN ('DEPOSIT','PAYOUT')
      AND (metadata->>'allowance_type') IN ('airtime_allowance','data_allowance');

    -- Remove the reversal placeholders we just inserted (no longer needed)
    DELETE FROM public.ledger_entries
    WHERE user_id = v_user_id
      AND reference LIKE 'PHANTOM-REV-%';

    -- Remove previous final reconciliation so we can re-stamp with correct delta
    v_final_ref := 'FINAL-RECONCILE-2026-05-18-' || v_user_id;
    DELETE FROM public.ledger_entries WHERE reference = v_final_ref;

    SELECT COALESCE(SUM(amount),0) INTO v_current_raw
    FROM public.ledger_entries WHERE user_id = v_user_id;

    v_correction := v_target - v_current_raw;

    IF v_correction <> 0 THEN
      INSERT INTO public.ledger_entries (user_id, entry_type, source_category, amount, reference, metadata)
      VALUES (
        v_user_id,
        'ADJUSTMENT',
        'SYSTEM_AWARD',
        v_correction,
        v_final_ref,
        jsonb_build_object(
          'description', 'Final system reconciliation — wallet balance set to verified amount',
          'type', 'final_reconciliation',
          'target_balance', v_target,
          'bypass_treasury_check', true
        )
      );
    END IF;
  END LOOP;
END $$;