CREATE TABLE public.treasury_momo_deposits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE,
  provider text NOT NULL,
  provider_reference text,
  phone text NOT NULL,
  amount numeric NOT NULL,
  account_code text NOT NULL DEFAULT 'operations',
  note text,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  initiated_by text NOT NULL,
  completed_at timestamptz,
  posted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.treasury_momo_deposits TO authenticated;
GRANT ALL ON public.treasury_momo_deposits TO service_role;
ALTER TABLE public.treasury_momo_deposits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins and finance can view pool deposits" ON public.treasury_momo_deposits
  FOR SELECT TO authenticated USING (public.is_current_user_admin() OR public.can_process_finance());
CREATE TRIGGER trg_treasury_momo_deposits_updated BEFORE UPDATE ON public.treasury_momo_deposits
  FOR EACH ROW EXECUTE FUNCTION public.budget_touch_updated_at();

CREATE OR REPLACE FUNCTION public.finalize_treasury_momo_deposit(p_reference text, p_status text, p_error text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d public.treasury_momo_deposits;
BEGIN
  SELECT * INTO d FROM public.treasury_momo_deposits WHERE reference = p_reference FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'not found'); END IF;
  IF d.posted OR d.status IN ('completed','failed') THEN
    RETURN jsonb_build_object('ok', true, 'status', d.status, 'already', true);
  END IF;
  IF p_status = 'completed' THEN
    PERFORM public.treasury_account_post(d.account_code, 'credit', d.amount, 'external', d.reference, NULL, NULL, NULL,
      'Mobile money deposit via ' || CASE WHEN d.provider='yo' THEN 'Yo Payments' ELSE 'GosentePay' END || ' from ' || d.phone,
      d.initiated_by, jsonb_build_object('provider', d.provider, 'phone', d.phone, 'momo_deposit', true));
    PERFORM public.record_treasury_entry('credit', d.amount,
      CASE WHEN d.provider='yo' THEN 'yo_payments'::treasury_channel ELSE 'other'::treasury_channel END,
      'deposit', d.reference, d.initiated_by, NULL,
      'Cash in via ' || CASE WHEN d.provider='yo' THEN 'Yo Payments' ELSE 'GosentePay' END || ' from ' || d.phone || COALESCE(' — ' || d.note, ''),
      d.initiated_by, jsonb_build_object('provider', d.provider, 'treasury_account', d.account_code, 'momo_deposit', true));
    UPDATE public.treasury_momo_deposits SET status='completed', posted=true, completed_at=now() WHERE id=d.id;
  ELSIF p_status = 'failed' THEN
    UPDATE public.treasury_momo_deposits SET status='failed', error_message=p_error, completed_at=now() WHERE id=d.id;
  END IF;
  RETURN jsonb_build_object('ok', true, 'status', p_status);
END; $$;
REVOKE ALL ON FUNCTION public.finalize_treasury_momo_deposit(text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_treasury_momo_deposit(text,text,text) TO service_role;