CREATE TABLE public.bank_deposit_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  employee_email text NOT NULL,
  employee_name text,
  amount numeric NOT NULL CHECK (amount >= 2000),
  fee numeric NOT NULL DEFAULT 0,
  total_deducted numeric NOT NULL DEFAULT 0,
  bank_name text NOT NULL,
  branch text,
  account_number text NOT NULL,
  account_name text NOT NULL,
  reference text NOT NULL,
  status text NOT NULL DEFAULT 'pending_admin',
  notes text,
  admin_approved_by text,
  admin_approved_at timestamptz,
  final_approved_by text,
  final_approved_at timestamptz,
  paid_by text,
  paid_at timestamptz,
  payment_reference text,
  rejection_reason text,
  rejected_by text,
  rejected_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.bank_deposit_requests TO authenticated;
GRANT ALL ON public.bank_deposit_requests TO service_role;

ALTER TABLE public.bank_deposit_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bank deposit requests"
ON public.bank_deposit_requests FOR SELECT TO authenticated
USING (
  user_id = (auth.uid())::text
  OR employee_email = public.get_current_user_email()
  OR user_id = (SELECT public.get_unified_user_id(public.get_current_user_email()))
);

CREATE POLICY "Admins can view all bank deposit requests"
ON public.bank_deposit_requests FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'Super Admin') OR public.has_role(auth.uid(), 'Administrator'));

CREATE POLICY "Users can create own bank deposit requests"
ON public.bank_deposit_requests FOR INSERT TO authenticated
WITH CHECK (
  employee_email = public.get_current_user_email()
  AND status = 'pending_admin'
);

CREATE POLICY "Admins can update bank deposit requests"
ON public.bank_deposit_requests FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'Super Admin') OR public.has_role(auth.uid(), 'Administrator'))
WITH CHECK (public.has_role(auth.uid(), 'Super Admin') OR public.has_role(auth.uid(), 'Administrator'));

CREATE TRIGGER trg_bank_deposit_requests_updated_at
BEFORE UPDATE ON public.bank_deposit_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Final approval + mark as paid (restricted to the Managing Director)
CREATE OR REPLACE FUNCTION public.finalize_bank_deposit_request(
  p_request_id uuid,
  p_payment_reference text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text := lower(coalesce(public.get_current_user_email(), ''));
  v_req public.bank_deposit_requests%ROWTYPE;
  v_total numeric;
BEGIN
  IF v_email <> 'fauzakusa@greatpearlcoffee.com' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Only the Managing Director can give final approval and mark bank deposits as paid.');
  END IF;

  SELECT * INTO v_req FROM public.bank_deposit_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Request not found');
  END IF;

  IF v_req.status = 'paid' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This request has already been paid.');
  END IF;

  IF v_req.status <> 'admin_approved' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This request must first be approved by an administrator.');
  END IF;

  v_total := v_req.amount + coalesce(v_req.fee, 0);

  INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, source_category, metadata)
  VALUES (
    v_req.user_id, 'WITHDRAWAL', v_req.amount, v_req.reference, 'WITHDRAWAL',
    jsonb_build_object(
      'description', 'Bank deposit to ' || v_req.bank_name || ' A/C ' || v_req.account_number,
      'channel', 'BANK_DEPOSIT',
      'bank_deposit_request_id', v_req.id
    )
  );

  IF coalesce(v_req.fee, 0) > 0 THEN
    INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, source_category, metadata)
    VALUES (
      v_req.user_id, 'FEE', v_req.fee, v_req.reference || '-FEE', 'WITHDRAW_FEE',
      jsonb_build_object(
        'description', 'Bank deposit service fee',
        'channel', 'BANK_DEPOSIT',
        'bank_deposit_request_id', v_req.id
      )
    );
  END IF;

  UPDATE public.bank_deposit_requests
  SET status = 'paid',
      final_approved_by = v_email,
      final_approved_at = now(),
      paid_by = v_email,
      paid_at = now(),
      total_deducted = v_total,
      payment_reference = coalesce(p_payment_reference, payment_reference)
  WHERE id = p_request_id;

  RETURN jsonb_build_object('ok', true, 'total_deducted', v_total);
END;
$$;

GRANT EXECUTE ON FUNCTION public.finalize_bank_deposit_request(uuid, text) TO authenticated;