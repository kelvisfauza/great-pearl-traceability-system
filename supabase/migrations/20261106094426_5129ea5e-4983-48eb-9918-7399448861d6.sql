CREATE OR REPLACE FUNCTION public.treasury_post_gosente_fee() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_gross numeric; v_fee numeric; v_ref text;
BEGIN
  IF NEW.change_type = 'payout_deduction' THEN
    v_gross := -NEW.change_amount;
    IF v_gross <= 0 THEN RETURN NEW; END IF;
    v_fee := CASE WHEN v_gross - 2200 > 60000 THEN 2200 ELSE 1600 END;
    v_ref := 'GSFEE-' || NEW.reference;
    IF EXISTS (SELECT 1 FROM treasury_account_entries WHERE reference = v_ref AND direction='debit') THEN RETURN NEW; END IF;
    BEGIN
      PERFORM public.treasury_account_post('operations','debit',v_fee,'external',v_ref,NULL,NULL,NULL,
        'GosentePay service charge on payout '||NEW.reference,'system',jsonb_build_object('kind','provider_fee','provider','gosentepay','payout_reference',NEW.reference));
    EXCEPTION WHEN others THEN RAISE WARNING 'GosentePay fee posting failed for %: %', NEW.reference, SQLERRM; END;
  ELSIF NEW.change_type = 'payout_reversal' THEN
    v_ref := 'GSFEE-' || NEW.reference;
    SELECT amount INTO v_fee FROM treasury_account_entries WHERE reference=v_ref AND direction='debit' LIMIT 1;
    IF v_fee IS NULL OR EXISTS (SELECT 1 FROM treasury_account_entries WHERE reference=v_ref AND direction='credit') THEN RETURN NEW; END IF;
    BEGIN
      PERFORM public.treasury_account_post('operations','credit',v_fee,'external',v_ref,NULL,NULL,NULL,
        'GosentePay service charge returned (payout bounced) '||NEW.reference,'system',jsonb_build_object('kind','provider_fee_reversal','provider','gosentepay'));
    EXCEPTION WHEN others THEN RAISE WARNING 'GosentePay fee reversal failed for %: %', NEW.reference, SQLERRM; END;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.treasury_post_gosente_fee() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_gosente_fee_to_treasury ON public.gosentepay_balance_log;
CREATE TRIGGER trg_gosente_fee_to_treasury AFTER INSERT ON public.gosentepay_balance_log
FOR EACH ROW EXECUTE FUNCTION public.treasury_post_gosente_fee();

CREATE OR REPLACE FUNCTION public.treasury_bank_movement(p_direction text, p_amount numeric, p_description text DEFAULT NULL::text, p_fee numeric DEFAULT 0)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_new NUMERIC; v_ref TEXT; v_by TEXT;
BEGIN
  IF NOT public.treasury_is_super_admin() THEN RETURN jsonb_build_object('ok',false,'error','Only the Super Admin can record bank movements'); END IF;
  IF p_direction NOT IN ('deposit','withdraw') THEN RETURN jsonb_build_object('ok',false,'error','Choose deposit or withdraw'); END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN RETURN jsonb_build_object('ok',false,'error','Amount must be greater than zero'); END IF;
  IF COALESCE(p_fee,0) < 0 THEN RETURN jsonb_build_object('ok',false,'error','Bank charge cannot be negative'); END IF;
  v_by := COALESCE(public.current_user_email(),'super_admin');
  v_ref := 'BANK-' || UPPER(p_direction) || '-' || to_char(now(),'YYYYMMDDHH24MISS');
  BEGIN
    v_new := public.treasury_account_post('cash_at_bank', CASE WHEN p_direction='deposit' THEN 'credit' ELSE 'debit' END, p_amount,'external',v_ref,NULL,NULL,NULL,
      COALESCE(p_description, CASE WHEN p_direction='deposit' THEN 'Bank deposit' ELSE 'Bank withdrawal' END), v_by, jsonb_build_object('manual',true,'bank_movement',p_direction));
    IF COALESCE(p_fee,0) > 0 THEN
      v_new := public.treasury_account_post('cash_at_bank','debit',p_fee,'external',v_ref||'-FEE',NULL,NULL,NULL,
        'Bank charge on '||COALESCE(p_description, p_direction), v_by, jsonb_build_object('manual',true,'kind','bank_fee'));
    END IF;
  EXCEPTION WHEN others THEN RETURN jsonb_build_object('ok',false,'error',SQLERRM); END;
  RETURN jsonb_build_object('ok',true,'reference',v_ref,'balance',v_new);
END; $function$;
DROP FUNCTION IF EXISTS public.treasury_bank_movement(text, numeric, text);
REVOKE ALL ON FUNCTION public.treasury_bank_movement(text, numeric, text, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.treasury_bank_movement(text, numeric, text, numeric) TO authenticated, service_role;