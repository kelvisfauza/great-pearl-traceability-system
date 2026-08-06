CREATE OR REPLACE FUNCTION public.claim_bonus(p_bonus_id uuid, p_reference text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_uid uuid := auth.uid();
  v_bonus public.bonuses%ROWTYPE;
  v_ref text;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authenticated');
  END IF;

  SELECT email INTO v_email FROM public.employees WHERE auth_user_id = v_uid LIMIT 1;
  IF v_email IS NULL THEN
    SELECT email INTO v_email FROM auth.users WHERE id = v_uid;
  END IF;

  SELECT * INTO v_bonus FROM public.bonuses WHERE id = p_bonus_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Bonus not found');
  END IF;

  IF lower(coalesce(v_bonus.employee_email, '')) <> lower(coalesce(v_email, '')) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This bonus does not belong to you');
  END IF;

  IF v_bonus.status <> 'pending' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This bonus has already been claimed');
  END IF;

  v_ref := COALESCE(p_reference, 'BNS-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(md5(random()::text), 1, 4)));

  UPDATE public.bonuses
     SET status = 'claimed', claimed_at = now()
   WHERE id = p_bonus_id;

  INSERT INTO public.ledger_entries (user_id, entry_type, amount, source_category, reference, metadata)
  VALUES (
    v_uid::text,
    'BONUS',
    v_bonus.amount,
    'SYSTEM_AWARD',
    v_ref,
    jsonb_build_object(
      'description', 'Bonus claimed – ' || coalesce(v_bonus.reason, 'Employee bonus'),
      'bonus_id', v_bonus.id,
      'reason', v_bonus.reason,
      'allocated_by', v_bonus.allocated_by,
      'voucher_ref', v_ref
    )
  );

  RETURN jsonb_build_object('ok', true, 'reference', v_ref, 'amount', v_bonus.amount);
END;
$$;

REVOKE ALL ON FUNCTION public.claim_bonus(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_bonus(uuid, text) TO authenticated;