-- Re-stamp final reconciliation entries so that EFFECTIVE wallet balance equals target
-- (previous run targeted raw SUM, which causes "insufficient balance" on transfers because
-- get_effective_wallet_balance only counts a subset of entry types.)

DO $$
DECLARE
  targets RECORD;
  v_user_id text;
  v_target numeric;
  v_final_ref text;
  v_current_effective numeric;
  v_correction numeric;
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
    v_final_ref := 'FINAL-RECONCILE-EFFECTIVE-2026-05-18-' || v_user_id;

    -- Remove any prior final reconciliation entries so we can re-stamp cleanly
    DELETE FROM public.ledger_entries
    WHERE user_id = v_user_id
      AND (reference = 'FINAL-RECONCILE-2026-05-18-' || v_user_id
           OR reference = v_final_ref);

    -- Compute effective balance AFTER removing the prior stamp
    v_current_effective := public.get_effective_wallet_balance(v_user_id);
    v_correction := v_target - v_current_effective;

    IF v_correction <> 0 THEN
      INSERT INTO public.ledger_entries (user_id, entry_type, source_category, amount, reference, metadata)
      VALUES (
        v_user_id,
        'ADJUSTMENT',
        'SYSTEM_AWARD',
        v_correction,
        v_final_ref,
        jsonb_build_object(
          'description', 'Final reconciliation — effective wallet balance set to verified amount',
          'type', 'final_reconciliation_effective',
          'target_balance', v_target,
          'bypass_treasury_check', true
        )
      );
    END IF;
  END LOOP;
END $$;