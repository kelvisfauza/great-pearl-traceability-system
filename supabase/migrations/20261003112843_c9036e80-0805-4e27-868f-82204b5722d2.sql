CREATE OR REPLACE FUNCTION public.finalize_bank_deposit_request(p_request_id uuid, p_payment_reference text DEFAULT NULL::text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_email text := lower(coalesce(public.get_current_user_email(), ''));
  v_req public.bank_deposit_requests%ROWTYPE;
  v_total numeric;
BEGIN
  IF v_email <> 'fauzakusa@greatpearlcoffee.com' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Only the Managing Director can give final approval and mark bank deposits as paid.');
  END IF;
  SELECT * INTO v_req FROM public.bank_deposit_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'Request not found'); END IF;
  IF v_req.status = 'paid' THEN RETURN jsonb_build_object('ok', false, 'error', 'This request has already been paid.'); END IF;
  IF v_req.status <> 'admin_approved' THEN RETURN jsonb_build_object('ok', false, 'error', 'This request must first be approved by an administrator.'); END IF;

  v_total := v_req.amount + coalesce(v_req.fee, 0);

  INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, source_category, metadata)
  VALUES (v_req.user_id, 'WITHDRAWAL', -abs(v_req.amount), v_req.reference, 'WITHDRAWAL',
    jsonb_build_object('description', 'Bank deposit to ' || v_req.bank_name || ' A/C ' || v_req.account_number,
      'channel', 'BANK_DEPOSIT', 'bank_deposit_request_id', v_req.id));

  IF coalesce(v_req.fee, 0) > 0 THEN
    INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, source_category, metadata)
    VALUES (v_req.user_id, 'FEE', -abs(v_req.fee), v_req.reference || '-FEE', 'WITHDRAW_FEE',
      jsonb_build_object('description', 'Bank deposit service fee', 'channel', 'BANK_DEPOSIT',
        'bank_deposit_request_id', v_req.id, 'bypass_treasury_check', true));
  END IF;

  UPDATE public.bank_deposit_requests
  SET status = 'paid', final_approved_by = v_email, final_approved_at = now(),
      paid_by = v_email, paid_at = now(), total_deducted = v_total,
      payment_reference = coalesce(p_payment_reference, payment_reference)
  WHERE id = p_request_id;

  RETURN jsonb_build_object('ok', true, 'total_deducted', v_total);
END;
$function$;

-- Correct John Masereka's fee that was credited instead of deducted
UPDATE public.ledger_entries
SET amount = -1700,
    metadata = metadata || jsonb_build_object('bypass_treasury_check', true, 'corrected_sign_at', now())
WHERE id = '00a6eb33-b6e5-4e97-aba9-da082518b7b6' AND amount = 1700;