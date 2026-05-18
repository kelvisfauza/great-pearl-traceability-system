-- Reconcile Denis's wallet to verified balance of 99,713
DO $$
DECLARE
  v_user_id TEXT := '7cdf79bf-c024-4107-98a7-3d84dbf0e975';
  v_target NUMERIC := 99713;
  v_current_raw NUMERIC;
  v_correction NUMERIC;
  v_final_ref TEXT := 'FINAL-RECONCILE-2026-05-18-7cdf79bf-c024-4107-98a7-3d84dbf0e975';
  r RECORD;
  v_phantom_ref TEXT;
BEGIN
  -- Reverse phantom airtime/data DEPOSIT or PAYOUT entries (idempotent)
  FOR r IN
    SELECT id, amount FROM public.ledger_entries
    WHERE user_id = v_user_id
      AND entry_type IN ('DEPOSIT','PAYOUT')
      AND (metadata->>'allowance_type') IN ('airtime_allowance','data_allowance')
  LOOP
    v_phantom_ref := 'PHANTOM-REV-' || r.id::text;
    IF NOT EXISTS (SELECT 1 FROM public.ledger_entries WHERE reference = v_phantom_ref) THEN
      INSERT INTO public.ledger_entries (user_id, entry_type, source_category, amount, reference, metadata)
      VALUES (v_user_id, 'ADJUSTMENT', 'SYSTEM_AWARD', -r.amount, v_phantom_ref,
        jsonb_build_object(
          'description','Reversal of phantom airtime/data wallet credit (not real wallet funds)',
          'type','phantom_reversal','reverses_entry', r.id,'bypass_treasury_check', true));
    END IF;
  END LOOP;

  -- Remove any previous final reconciliation entry, then re-stamp
  DELETE FROM public.ledger_entries WHERE reference = v_final_ref;

  SELECT COALESCE(SUM(amount),0) INTO v_current_raw
  FROM public.ledger_entries WHERE user_id = v_user_id;

  v_correction := v_target - v_current_raw;

  IF v_correction <> 0 THEN
    INSERT INTO public.ledger_entries (user_id, entry_type, source_category, amount, reference, metadata)
    VALUES (v_user_id, 'ADJUSTMENT', 'SYSTEM_AWARD', v_correction, v_final_ref,
      jsonb_build_object(
        'description','Final system reconciliation — wallet balance set to verified amount',
        'type','final_reconciliation','target_balance', v_target,'bypass_treasury_check', true));
  END IF;
END $$;