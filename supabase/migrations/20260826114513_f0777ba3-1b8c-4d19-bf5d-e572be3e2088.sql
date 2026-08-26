CREATE TABLE public.grn_payment_allocations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_number text NOT NULL,
  lot_id uuid,
  pay_code text,
  supplier_name text,
  coffee_type text,
  quantity_kg numeric,
  amount_ugx numeric NOT NULL DEFAULT 0,
  referred_by_email text NOT NULL,
  referred_by_name text,
  assigned_to_email text NOT NULL,
  assigned_to_name text,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  paid_by_email text,
  paid_at timestamp with time zone,
  referrer_reward_ugx numeric NOT NULL DEFAULT 0,
  payer_reward_ugx numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.grn_payment_allocations TO authenticated;
GRANT ALL ON public.grn_payment_allocations TO service_role;

ALTER TABLE public.grn_payment_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view GRN referrals"
ON public.grn_payment_allocations FOR SELECT TO authenticated USING (true);

CREATE POLICY "Referrer can create own GRN referral"
ON public.grn_payment_allocations FOR INSERT TO authenticated
WITH CHECK (lower(referred_by_email) = lower(coalesce(public.current_user_email(), '')));

CREATE POLICY "Referrer or assignee can update GRN referral"
ON public.grn_payment_allocations FOR UPDATE TO authenticated
USING (
  lower(referred_by_email) = lower(coalesce(public.current_user_email(), ''))
  OR lower(assigned_to_email) = lower(coalesce(public.current_user_email(), ''))
);

CREATE INDEX idx_grn_alloc_status ON public.grn_payment_allocations (status, created_at DESC);
CREATE INDEX idx_grn_alloc_batch ON public.grn_payment_allocations (batch_number);
CREATE INDEX idx_grn_alloc_assignee ON public.grn_payment_allocations (lower(assigned_to_email));

CREATE TRIGGER update_grn_payment_allocations_updated_at
BEFORE UPDATE ON public.grn_payment_allocations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.complete_grn_referral(
  p_batch text,
  p_lot_id uuid DEFAULT NULL,
  p_payer_email text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_alloc public.grn_payment_allocations;
  v_payer text := lower(coalesce(p_payer_email, public.current_user_email(), ''));
  v_ref_uid uuid;
  v_pay_uid uuid;
  v_ref_res json;
  v_pay_res json;
  v_ctx jsonb;
BEGIN
  SELECT * INTO v_alloc
  FROM public.grn_payment_allocations
  WHERE status = 'pending'
    AND ((p_lot_id IS NOT NULL AND lot_id = p_lot_id) OR batch_number = p_batch)
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_alloc.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'No pending referral for this GRN');
  END IF;

  v_ctx := jsonb_build_object(
    'form_name', 'GRN Payment Referral',
    'description', 'grn supplier payment referral',
    'batch', v_alloc.batch_number,
    'amount', v_alloc.amount_ugx
  );

  SELECT id INTO v_ref_uid FROM auth.users WHERE lower(email) = lower(v_alloc.referred_by_email) LIMIT 1;
  SELECT id INTO v_pay_uid FROM auth.users WHERE lower(email) = v_payer LIMIT 1;

  IF v_ref_uid IS NOT NULL THEN
    v_ref_res := public.award_activity_reward(v_ref_uid, 'task_completion', v_ctx || jsonb_build_object('role', 'referrer'));
  END IF;

  IF v_pay_uid IS NOT NULL AND v_pay_uid IS DISTINCT FROM v_ref_uid THEN
    v_pay_res := public.award_activity_reward(v_pay_uid, 'transaction', v_ctx || jsonb_build_object('role', 'payer'));
  END IF;

  UPDATE public.grn_payment_allocations
  SET status = 'paid',
      paid_by_email = v_payer,
      paid_at = now(),
      lot_id = COALESCE(p_lot_id, lot_id),
      referrer_reward_ugx = COALESCE((v_ref_res->>'reward_given')::numeric, 0),
      payer_reward_ugx = COALESCE((v_pay_res->>'reward_given')::numeric, 0),
      updated_at = now()
  WHERE id = v_alloc.id;

  RETURN jsonb_build_object(
    'ok', true,
    'allocation_id', v_alloc.id,
    'referred_by', v_alloc.referred_by_email,
    'referrer_reward', COALESCE((v_ref_res->>'reward_given')::numeric, 0),
    'payer_reward', COALESCE((v_pay_res->>'reward_given')::numeric, 0)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_grn_referral(text, uuid, text) TO authenticated;