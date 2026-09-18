CREATE TABLE IF NOT EXISTS public.balance_check_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_email TEXT,
  check_date DATE NOT NULL DEFAULT ((now() AT TIME ZONE 'Africa/Kampala')::date),
  fee_charged NUMERIC NOT NULL DEFAULT 0,
  reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.balance_check_log TO authenticated;
GRANT ALL ON public.balance_check_log TO service_role;

ALTER TABLE public.balance_check_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view their own balance checks" ON public.balance_check_log;
CREATE POLICY "Users view their own balance checks"
ON public.balance_check_log FOR SELECT TO authenticated
USING (user_id = (auth.uid())::text OR user_id = public.get_unified_user_id(public.current_user_email()));

DROP POLICY IF EXISTS "Service role manages balance checks" ON public.balance_check_log;
CREATE POLICY "Service role manages balance checks"
ON public.balance_check_log FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_balance_check_log_user_date ON public.balance_check_log(user_id, check_date);

CREATE OR REPLACE FUNCTION public.charge_balance_check()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid text := (auth.uid())::text;
  v_email text;
  v_unified text;
  v_today date := ((now() AT TIME ZONE 'Africa/Kampala')::date);
  v_checks int := 0;
  v_fees numeric := 0;
  v_fee numeric := 0;
  v_ref text := 'BALCHK-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
  v_free_check int := 1;
  v_unit numeric := 200;
  v_cap numeric := 1000;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  BEGIN
    v_unified := public.get_unified_user_id(v_email);
  EXCEPTION WHEN OTHERS THEN
    v_unified := v_uid;
  END;
  IF v_unified IS NULL THEN v_unified := v_uid; END IF;

  SELECT count(*), COALESCE(sum(fee_charged),0)
    INTO v_checks, v_fees
  FROM public.balance_check_log
  WHERE user_id = v_unified AND check_date = v_today;

  IF v_checks >= v_free_check THEN
    v_fee := LEAST(v_unit, GREATEST(0, v_cap - v_fees));
  END IF;

  IF v_fee > 0 THEN
    INSERT INTO public.ledger_entries (user_id, entry_type, source_category, amount, reference, metadata)
    VALUES (
      v_unified, 'WITHDRAWAL', 'FEE', -v_fee, v_ref,
      jsonb_build_object(
        'source','balance_check_fee',
        'description','Wallet balance check fee',
        'check_number', v_checks + 1,
        'bypass_treasury_check', true
      )
    );
  END IF;

  INSERT INTO public.balance_check_log (user_id, user_email, check_date, fee_charged, reference)
  VALUES (v_unified, v_email, v_today, v_fee, CASE WHEN v_fee > 0 THEN v_ref ELSE NULL END);

  RETURN jsonb_build_object(
    'ok', true,
    'fee', v_fee,
    'checks_today', v_checks + 1,
    'fees_today', v_fees + v_fee,
    'free_check_used', v_checks >= v_free_check,
    'cap_reached', (v_fees + v_fee) >= v_cap,
    'daily_cap', v_cap,
    'reference', CASE WHEN v_fee > 0 THEN v_ref ELSE NULL END
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.charge_balance_check() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.charge_balance_check() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.balance_check_status()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid text := (auth.uid())::text;
  v_email text;
  v_unified text;
  v_today date := ((now() AT TIME ZONE 'Africa/Kampala')::date);
  v_checks int := 0;
  v_fees numeric := 0;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  BEGIN
    v_unified := public.get_unified_user_id(v_email);
  EXCEPTION WHEN OTHERS THEN
    v_unified := v_uid;
  END;
  IF v_unified IS NULL THEN v_unified := v_uid; END IF;

  SELECT count(*), COALESCE(sum(fee_charged),0) INTO v_checks, v_fees
  FROM public.balance_check_log
  WHERE user_id = v_unified AND check_date = v_today;

  RETURN jsonb_build_object(
    'checks_today', v_checks,
    'fees_today', v_fees,
    'next_fee', CASE WHEN v_checks < 1 THEN 0 ELSE LEAST(200, GREATEST(0, 1000 - v_fees)) END,
    'daily_cap', 1000
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.balance_check_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.balance_check_status() TO authenticated, service_role;