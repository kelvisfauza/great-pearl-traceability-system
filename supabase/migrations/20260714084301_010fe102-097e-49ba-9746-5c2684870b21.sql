
CREATE OR REPLACE FUNCTION public.charge_statement_fee(
  p_user_id text,
  p_period_from text,
  p_period_to text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_uid text := (auth.uid())::text;
  v_caller_email text;
  v_unified_id text;
  v_ref text := 'STMT-FEE-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  v_fee integer := 500;
BEGIN
  IF v_caller_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Resolve caller's unified id and ensure they can only charge themselves
  SELECT email INTO v_caller_email FROM auth.users WHERE id = auth.uid();
  BEGIN
    v_unified_id := public.get_unified_user_id(v_caller_email);
  EXCEPTION WHEN OTHERS THEN
    v_unified_id := v_caller_uid;
  END;
  IF v_unified_id IS NULL THEN v_unified_id := v_caller_uid; END IF;

  IF p_user_id IS NOT NULL AND p_user_id <> v_unified_id AND p_user_id <> v_caller_uid THEN
    RAISE EXCEPTION 'Cannot charge statement fee for another user';
  END IF;

  INSERT INTO public.ledger_entries (
    user_id, entry_type, source_category, amount, reference, metadata
  ) VALUES (
    v_unified_id,
    'WITHDRAWAL',
    'STATEMENT_FEE',
    -v_fee,
    v_ref,
    jsonb_build_object(
      'source', 'statement_fee',
      'description', 'Transaction Statement Charge',
      'period', p_period_from || ' to ' || p_period_to,
      'bypass_treasury_check', true
    )
  );

  RETURN jsonb_build_object('ok', true, 'reference', v_ref, 'user_id', v_unified_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.charge_statement_fee(text, text, text) TO authenticated;
