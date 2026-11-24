CREATE OR REPLACE FUNCTION public.treasury_external_reverse(p_account text, p_amount numeric, p_reference text, p_description text DEFAULT NULL::text, p_performed_by text DEFAULT 'system'::text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_new NUMERIC; v_held NUMERIC; v_return NUMERIC;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN RETURN jsonb_build_object('ok', true, 'skipped', true); END IF;
  PERFORM pg_advisory_xact_lock(hashtext('treasury_payout:' || p_account || ':' || p_reference));
  -- Return only what is still held for this reference, so every failed attempt
  -- (including retries) gets its money back once and never more.
  SELECT COALESCE(SUM(CASE WHEN direction = 'debit' THEN amount ELSE -amount END), 0)
    INTO v_held FROM public.treasury_account_entries
   WHERE reference = p_reference AND account_code = p_account;
  IF v_held <= 0 THEN
    RETURN jsonb_build_object('ok', true, 'nothing_to_reverse', true);
  END IF;
  v_return := LEAST(v_held, p_amount);
  v_new := public.treasury_account_post(
    p_account, 'credit', v_return, 'external', p_reference, NULL,
    NULL, NULL, COALESCE(p_description, 'Payout failed — funds returned'), COALESCE(p_performed_by,'system'),
    jsonb_build_object('external_payout_reversal', true)
  );
  RETURN jsonb_build_object('ok', true, 'balance_after', v_new);
END; $function$;