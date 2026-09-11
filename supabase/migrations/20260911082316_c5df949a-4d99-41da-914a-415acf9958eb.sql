ALTER TABLE public.procurement_reviews
  ADD COLUMN IF NOT EXISTS return_reason text,
  ADD COLUMN IF NOT EXISTS returned_by text,
  ADD COLUMN IF NOT EXISTS returned_at timestamptz,
  ADD COLUMN IF NOT EXISTS return_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS return_notified_at timestamptz;

-- Allow procurement to re-review a request an admin has sent back
CREATE OR REPLACE FUNCTION public.submit_procurement_review(_source_table text, _record_id text, _decision text, _notes text DEFAULT NULL::text, _recommended_admin_email text DEFAULT NULL::text, _recommended_admin_name text DEFAULT NULL::text, _edited_amount numeric DEFAULT NULL::numeric, _edited_description text DEFAULT NULL::text, _request_title text DEFAULT NULL::text, _requested_by text DEFAULT NULL::text, _amount numeric DEFAULT NULL::numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _email text;
  _orig numeric;
  _existing text;
  _row public.procurement_reviews;
BEGIN
  IF NOT public.is_procurement_reviewer(auth.uid()) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not allowed to review requests');
  END IF;

  IF _decision NOT IN ('pending', 'approved', 'rejected') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid decision');
  END IF;

  SELECT decision INTO _existing
  FROM public.procurement_reviews
  WHERE source_table = _source_table AND record_id = _record_id;

  IF _existing IS NOT NULL AND _existing NOT IN ('pending', 'returned') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This request has already been reviewed and the decision cannot be changed');
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
  ELSIF _source_table = 'provider_submission_requests' THEN
    SELECT amount INTO _orig FROM public.provider_submission_requests WHERE id = _record_id::uuid;
    IF _edited_amount IS NOT NULL AND _edited_amount > 0 THEN
      UPDATE public.provider_submission_requests
      SET amount = _edited_amount,
          description = COALESCE(_edited_description, description),
          updated_at = now()
      WHERE id = _record_id::uuid;
    ELSIF _edited_description IS NOT NULL THEN
      UPDATE public.provider_submission_requests
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
    admin_notified_at = NULL,
    updated_at = now()
  RETURNING * INTO _row;

  RETURN jsonb_build_object('ok', true, 'review', to_jsonb(_row));
END;
$function$;

-- Admin sends a request back to procurement for edits
CREATE OR REPLACE FUNCTION public.admin_return_to_procurement(
  _source_table text,
  _record_id text,
  _reason text,
  _request_title text DEFAULT NULL,
  _requested_by text DEFAULT NULL,
  _amount numeric DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _email text;
  _row public.procurement_reviews;
BEGIN
  IF NOT public.can_manage_users() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Only administrators can send requests back to procurement');
  END IF;
  IF _source_table NOT IN ('approval_requests', 'provider_submission_requests') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Unsupported request type');
  END IF;
  IF coalesce(trim(_reason), '') = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Please state what procurement should change');
  END IF;

  SELECT email INTO _email FROM auth.users WHERE id = auth.uid();

  INSERT INTO public.procurement_reviews AS pr (
    source_table, record_id, request_title, requested_by, amount, original_amount,
    decision, return_reason, returned_by, returned_at, return_count
  ) VALUES (
    _source_table, _record_id, _request_title, _requested_by, COALESCE(_amount, 0), _amount,
    'returned', _reason, _email, now(), 1
  )
  ON CONFLICT (source_table, record_id) DO UPDATE SET
    decision = 'returned',
    return_reason = EXCLUDED.return_reason,
    returned_by = EXCLUDED.returned_by,
    returned_at = now(),
    return_count = pr.return_count + 1,
    return_notified_at = NULL,
    admin_notified_at = NULL,
    request_title = COALESCE(pr.request_title, EXCLUDED.request_title),
    requested_by = COALESCE(pr.requested_by, EXCLUDED.requested_by),
    updated_at = now()
  RETURNING * INTO _row;

  RETURN jsonb_build_object('ok', true, 'review', to_jsonb(_row));
END;
$$;

REVOKE ALL ON FUNCTION public.admin_return_to_procurement(text, text, text, text, text, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_return_to_procurement(text, text, text, text, text, numeric) TO authenticated, service_role;