CREATE TABLE public.pending_supplier_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposed_name text NOT NULL,
  phone text,
  origin text NOT NULL,
  opening_balance numeric NOT NULL DEFAULT 0,
  proposed_by text NOT NULL,
  proposed_by_name text,
  coffee_record_id text REFERENCES public.coffee_records(id) ON DELETE SET NULL,
  delivery_label text,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by text,
  reviewed_at timestamptz,
  confirmed_supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.pending_supplier_requests TO authenticated;
GRANT ALL ON public.pending_supplier_requests TO service_role;

ALTER TABLE public.pending_supplier_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Store and procurement can propose suppliers"
  ON public.pending_supplier_requests FOR INSERT TO authenticated
  WITH CHECK (is_current_user_admin() OR user_has_permission('Store Management') OR user_has_permission('Procurement'));

CREATE POLICY "Store procurement and admins can view supplier requests"
  ON public.pending_supplier_requests FOR SELECT TO authenticated
  USING (is_current_user_admin() OR user_has_permission('Store Management') OR user_has_permission('Procurement'));

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_pending_supplier_requests_updated_at
  BEFORE UPDATE ON public.pending_supplier_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE SCHEMA IF NOT EXISTS supplier_requests_private;
REVOKE ALL ON SCHEMA supplier_requests_private FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION supplier_requests_private.can_review_supplier_requests()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT is_current_user_admin() OR user_has_permission('Procurement')
$$;

CREATE OR REPLACE FUNCTION supplier_requests_private.confirm(p_request_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  req public.pending_supplier_requests%ROWTYPE;
  new_id uuid;
  new_code text;
  next_num int;
BEGIN
  IF NOT supplier_requests_private.can_review_supplier_requests() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not allowed to review supplier requests');
  END IF;
  SELECT * INTO req FROM public.pending_supplier_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'Request not found'); END IF;
  IF req.status = 'confirmed' THEN
    RETURN jsonb_build_object('ok', true, 'already', true, 'supplier_id', req.confirmed_supplier_id);
  END IF;
  IF req.status <> 'pending' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Request already ' || req.status);
  END IF;

  SELECT id INTO new_id FROM public.suppliers
   WHERE lower(regexp_replace(name, '\s+', ' ', 'g')) = lower(regexp_replace(req.proposed_name, '\s+', ' ', 'g'))
   LIMIT 1;
  IF new_id IS NULL THEN
    SELECT COALESCE(MAX((regexp_match(code, 'GPC (\d+)'))[1]::int), 0) + 1 INTO next_num
      FROM public.suppliers WHERE code ~ '^GPC \d+$';
    new_code := 'GPC ' || lpad(next_num::text, 5, '0');
    INSERT INTO public.suppliers (name, code, phone, origin, opening_balance, date_registered)
    VALUES (req.proposed_name, new_code, req.phone, req.origin, COALESCE(req.opening_balance, 0), CURRENT_DATE)
    RETURNING id INTO new_id;
  END IF;

  IF req.coffee_record_id IS NOT NULL THEN
    UPDATE public.coffee_records SET supplier_name = req.proposed_name WHERE id = req.coffee_record_id;
  END IF;

  UPDATE public.pending_supplier_requests
     SET status = 'confirmed', confirmed_supplier_id = new_id,
         reviewed_by = current_user_email(), reviewed_at = now(), updated_at = now()
   WHERE id = p_request_id;

  RETURN jsonb_build_object('ok', true, 'supplier_id', new_id);
END $$;

CREATE OR REPLACE FUNCTION supplier_requests_private.decline(p_request_id uuid, p_real_supplier_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  req public.pending_supplier_requests%ROWTYPE;
  real_name text;
BEGIN
  IF NOT supplier_requests_private.can_review_supplier_requests() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not allowed to review supplier requests');
  END IF;
  SELECT * INTO req FROM public.pending_supplier_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'Request not found'); END IF;
  IF req.status = 'declined' THEN
    RETURN jsonb_build_object('ok', true, 'already', true);
  END IF;
  IF req.status <> 'pending' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Request already ' || req.status);
  END IF;

  SELECT name INTO real_name FROM public.suppliers WHERE id = p_real_supplier_id;
  IF real_name IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'Chosen supplier not found'); END IF;

  IF req.coffee_record_id IS NOT NULL THEN
    UPDATE public.coffee_records SET supplier_name = real_name WHERE id = req.coffee_record_id;
  END IF;

  UPDATE public.pending_supplier_requests
     SET status = 'declined', confirmed_supplier_id = p_real_supplier_id,
         reviewed_by = current_user_email(), reviewed_at = now(), updated_at = now()
   WHERE id = p_request_id;

  RETURN jsonb_build_object('ok', true, 'supplier_id', p_real_supplier_id);
END $$;

CREATE OR REPLACE FUNCTION public.confirm_pending_supplier(p_request_id uuid)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path = public AS $$
  SELECT supplier_requests_private.confirm(p_request_id)
$$;

CREATE OR REPLACE FUNCTION public.decline_pending_supplier(p_request_id uuid, p_real_supplier_id uuid)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path = public AS $$
  SELECT supplier_requests_private.decline(p_request_id, p_real_supplier_id)
$$;

GRANT EXECUTE ON FUNCTION public.confirm_pending_supplier(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decline_pending_supplier(uuid, uuid) TO authenticated;