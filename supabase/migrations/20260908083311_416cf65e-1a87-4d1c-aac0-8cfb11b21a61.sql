CREATE OR REPLACE FUNCTION public.is_procurement_reviewer(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.employees e
    JOIN auth.users u ON lower(u.email) = lower(e.email)
    WHERE u.id = _user_id
      AND COALESCE(e.disabled, false) = false
      AND (
        lower(COALESCE(e.department, '')) LIKE '%procurement%'
        OR lower(COALESCE(e.role, '')) LIKE '%procurement%'
        OR lower(COALESCE(e.role, '')) LIKE '%admin%'
      )
  );
$$;

CREATE TABLE public.procurement_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_table text NOT NULL,
  record_id text NOT NULL,
  request_title text,
  requested_by text,
  amount numeric DEFAULT 0,
  decision text NOT NULL DEFAULT 'pending',
  notes text,
  original_amount numeric,
  edited_amount numeric,
  recommended_admin_email text,
  recommended_admin_name text,
  reviewed_by text,
  reviewed_at timestamptz,
  notified_at timestamptz,
  admin_notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_table, record_id)
);

GRANT SELECT, INSERT, UPDATE ON public.procurement_reviews TO authenticated;
GRANT ALL ON public.procurement_reviews TO service_role;

ALTER TABLE public.procurement_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view procurement reviews"
ON public.procurement_reviews FOR SELECT TO authenticated USING (true);

CREATE POLICY "Procurement and admins can create reviews"
ON public.procurement_reviews FOR INSERT TO authenticated
WITH CHECK (public.is_procurement_reviewer(auth.uid()));

CREATE POLICY "Procurement and admins can update reviews"
ON public.procurement_reviews FOR UPDATE TO authenticated
USING (public.is_procurement_reviewer(auth.uid()))
WITH CHECK (public.is_procurement_reviewer(auth.uid()));

CREATE TRIGGER trg_procurement_reviews_updated_at
BEFORE UPDATE ON public.procurement_reviews
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_procurement_reviews_decision ON public.procurement_reviews (decision, created_at DESC);

CREATE OR REPLACE FUNCTION public.submit_procurement_review(
  _source_table text,
  _record_id text,
  _decision text,
  _notes text DEFAULT NULL,
  _recommended_admin_email text DEFAULT NULL,
  _recommended_admin_name text DEFAULT NULL,
  _edited_amount numeric DEFAULT NULL,
  _edited_description text DEFAULT NULL,
  _request_title text DEFAULT NULL,
  _requested_by text DEFAULT NULL,
  _amount numeric DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _email text;
  _orig numeric;
  _row public.procurement_reviews;
BEGIN
  IF NOT public.is_procurement_reviewer(auth.uid()) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not allowed to review requests');
  END IF;

  IF _decision NOT IN ('pending', 'approved', 'rejected') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid decision');
  END IF;

  SELECT email INTO _email FROM auth.users WHERE id = auth.uid();

  IF _source_table = 'approval_requests' THEN
    SELECT amount INTO _orig FROM public.approval_requests WHERE id = _record_id::uuid;
    IF _edited_amount IS NOT NULL AND _edited_amount > 0 THEN
      UPDATE public.approval_requests
      SET amount = _edited_amount,
          description = COALESCE(_edited_description, description),
          updated_at = now()
      WHERE id = _record_id::uuid;
    ELSIF _edited_description IS NOT NULL THEN
      UPDATE public.approval_requests
      SET description = _edited_description, updated_at = now()
      WHERE id = _record_id::uuid;
    END IF;
  END IF;

  INSERT INTO public.procurement_reviews AS pr (
    source_table, record_id, request_title, requested_by, amount,
    decision, notes, original_amount, edited_amount,
    recommended_admin_email, recommended_admin_name, reviewed_by, reviewed_at
  ) VALUES (
    _source_table, _record_id, _request_title, _requested_by, COALESCE(_edited_amount, _amount, _orig, 0),
    _decision, _notes, COALESCE(_orig, _amount), _edited_amount,
    _recommended_admin_email, _recommended_admin_name, _email, now()
  )
  ON CONFLICT (source_table, record_id) DO UPDATE SET
    decision = EXCLUDED.decision,
    notes = COALESCE(EXCLUDED.notes, pr.notes),
    request_title = COALESCE(EXCLUDED.request_title, pr.request_title),
    requested_by = COALESCE(EXCLUDED.requested_by, pr.requested_by),
    amount = EXCLUDED.amount,
    original_amount = COALESCE(pr.original_amount, EXCLUDED.original_amount),
    edited_amount = COALESCE(EXCLUDED.edited_amount, pr.edited_amount),
    recommended_admin_email = COALESCE(EXCLUDED.recommended_admin_email, pr.recommended_admin_email),
    recommended_admin_name = COALESCE(EXCLUDED.recommended_admin_name, pr.recommended_admin_name),
    reviewed_by = EXCLUDED.reviewed_by,
    reviewed_at = now(),
    updated_at = now()
  RETURNING * INTO _row;

  RETURN jsonb_build_object('ok', true, 'review', to_jsonb(_row));
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_procurement_review(text, text, text, text, text, text, numeric, text, text, text, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_procurement_reviewer(uuid) TO authenticated;