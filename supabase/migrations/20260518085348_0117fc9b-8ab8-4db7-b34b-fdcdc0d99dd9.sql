-- Re-stamp Denis's final reconciliation so EFFECTIVE balance = 99,713
DO $$
DECLARE
  v_user_id TEXT := '7cdf79bf-c024-4107-98a7-3d84dbf0e975';
  v_target NUMERIC := 99713;
  v_current_effective NUMERIC;
  v_correction NUMERIC;
  v_final_ref TEXT := 'FINAL-RECONCILE-2026-05-18-7cdf79bf-c024-4107-98a7-3d84dbf0e975';
BEGIN
  -- Remove previous reconciliation entry
  DELETE FROM public.ledger_entries WHERE reference = v_final_ref;

  -- Compute current effective balance (without our entry)
  v_current_effective := public.get_effective_wallet_balance(v_user_id);
  v_correction := v_target - v_current_effective;

  IF v_correction <> 0 THEN
    INSERT INTO public.ledger_entries (user_id, entry_type, source_category, amount, reference, metadata)
    VALUES (v_user_id, 'ADJUSTMENT', 'SYSTEM_AWARD', v_correction, v_final_ref,
      jsonb_build_object(
        'description','Final system reconciliation — wallet balance set to verified amount',
        'type','final_reconciliation','target_balance', v_target,'bypass_treasury_check', true));
  END IF;
END $$;