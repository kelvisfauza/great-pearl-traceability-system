CREATE OR REPLACE FUNCTION public.treasury_external_payout(p_account text, p_amount numeric, p_reference text, p_description text DEFAULT NULL::text, p_email text DEFAULT NULL::text, p_name text DEFAULT NULL::text, p_performed_by text DEFAULT 'system'::text, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_new NUMERIC; v_held NUMERIC;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN RETURN jsonb_build_object('ok', true, 'skipped', true); END IF;
  PERFORM pg_advisory_xact_lock(hashtext('treasury_payout:' || p_account || ':' || p_reference));
  -- Only an outstanding (not yet returned) reservation counts as a duplicate.
  -- A retry after a failed attempt whose funds were returned must draw again.
  SELECT COALESCE(SUM(CASE WHEN direction = 'debit' THEN amount ELSE -amount END), 0)
    INTO v_held
    FROM public.treasury_account_entries
   WHERE reference = p_reference AND account_code = p_account;
  IF v_held >= p_amount THEN
    RETURN jsonb_build_object('ok', true, 'duplicate', true);
  END IF;
  v_new := public.treasury_account_post(
    p_account, 'debit', p_amount - GREATEST(v_held, 0), 'external', p_reference, NULL,
    p_email, p_name, COALESCE(p_description, 'Direct payout'), COALESCE(p_performed_by,'system'),
    COALESCE(p_metadata,'{}'::jsonb) || jsonb_build_object('external_payout', true)
  );
  RETURN jsonb_build_object('ok', true, 'balance_after', v_new);
END; $function$;