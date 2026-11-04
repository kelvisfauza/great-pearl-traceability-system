CREATE OR REPLACE FUNCTION public.gosentepay_reverse_payout(p_reference text, p_reason text DEFAULT 'Payout failed at provider')
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_amt numeric;
BEGIN
  IF p_reference IS NULL OR p_reference = '' THEN RETURN NULL; END IF;
  SELECT -change_amount INTO v_amt FROM gosentepay_balance_log
   WHERE reference = p_reference AND change_type = 'payout_deduction' ORDER BY created_at DESC LIMIT 1;
  IF v_amt IS NULL OR v_amt <= 0 THEN RETURN NULL; END IF;
  RETURN public.gosentepay_balance_adjust(v_amt, 'payout_reversal', p_reference, p_reason || ' — returned UGX ' || v_amt::text, 'system');
END $$;
REVOKE ALL ON FUNCTION public.gosentepay_reverse_payout(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.gosentepay_reverse_payout(text, text) TO service_role;