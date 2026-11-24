CREATE OR REPLACE FUNCTION public.decline_loan_counter_offer(p_loan_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE l public.loans%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Please sign in again.'; END IF;
  SELECT * INTO l FROM public.loans WHERE id = p_loan_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Loan not found'; END IF;
  IF lower(COALESCE(l.employee_email,'')) <> lower(public.get_current_user_email()) THEN RAISE EXCEPTION 'Only the borrower can decline this offer'; END IF;
  IF l.status <> 'counter_offered' THEN RAISE EXCEPTION 'This loan has no open counter offer'; END IF;
  PERFORM set_config('app.loan_counter_accept', p_loan_id::text, true);
  UPDATE public.loans SET status = 'rejected', admin_rejection_reason = 'Borrower declined counter offer' WHERE id = p_loan_id;
  PERFORM set_config('app.loan_counter_accept', '', true);
  RETURN jsonb_build_object('ok', true);
END $$;

CREATE OR REPLACE FUNCTION public.sign_loan_revision(p_loan_id uuid, p_signature text, p_terms_version text, p_accepted_at timestamptz)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE l public.loans%ROWTYPE; v_freq text; v_months int; v_inst numeric;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Please sign in again.'; END IF;
  IF COALESCE(trim(p_signature),'') = '' THEN RAISE EXCEPTION 'Signature required'; END IF;
  SELECT * INTO l FROM public.loans WHERE id = p_loan_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Loan not found'; END IF;
  IF lower(COALESCE(l.employee_email,'')) <> lower(public.get_current_user_email()) THEN RAISE EXCEPTION 'Only the borrower can sign these terms'; END IF;
  IF l.status <> 'revision_pending_signature' THEN RAISE EXCEPTION 'There are no revised terms awaiting your signature'; END IF;
  IF COALESCE(l.revision_total_repayable,0) <= 0 THEN RAISE EXCEPTION 'Revised terms are incomplete'; END IF;
  v_freq := COALESCE(l.revision_frequency, l.repayment_frequency, 'monthly');
  v_months := COALESCE(l.revision_duration_months, l.duration_months);
  v_inst := COALESCE(l.revision_installment, 0);
  PERFORM set_config('app.loan_counter_accept', p_loan_id::text, true);
  UPDATE public.loans SET
    loan_amount = COALESCE(l.revision_amount, l.loan_amount),
    original_loan_amount = COALESCE(l.original_loan_amount, l.loan_amount),
    duration_months = v_months,
    repayment_frequency = v_freq,
    total_weeks = CASE WHEN v_freq = 'weekly' THEN v_months * 4 ELSE l.total_weeks END,
    total_repayable = l.revision_total_repayable,
    remaining_balance = l.revision_total_repayable,
    monthly_installment = CASE WHEN v_freq = 'weekly' THEN NULL ELSE v_inst END,
    weekly_installment = CASE WHEN v_freq = 'weekly' THEN v_inst ELSE NULL END,
    status = 'pending_admin',
    revision_signed_at = COALESCE(p_accepted_at, now()),
    revision_signature = p_signature,
    revision_terms_version = p_terms_version,
    terms_version = p_terms_version,
    terms_signature = p_signature,
    terms_accepted_at = COALESCE(p_accepted_at, now())
  WHERE id = p_loan_id;
  PERFORM set_config('app.loan_counter_accept', '', true);
  RETURN jsonb_build_object('ok', true);
END $$;

REVOKE ALL ON FUNCTION public.decline_loan_counter_offer(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.sign_loan_revision(uuid, text, text, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.decline_loan_counter_offer(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sign_loan_revision(uuid, text, text, timestamptz) TO authenticated;