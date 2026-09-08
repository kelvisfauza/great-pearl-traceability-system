-- Allow procurement reviewers to see provider/meal/per-diem submissions
CREATE POLICY "Procurement reviewers can view submissions"
ON public.provider_submission_requests
FOR SELECT
TO authenticated
USING (public.is_procurement_reviewer(auth.uid()));

-- Extend the review RPC to handle provider_submission_requests edits
CREATE OR REPLACE FUNCTION public.submit_procurement_review(_source_table text, _record_id text, _decision text, _notes text DEFAULT NULL::text, _recommended_admin_email text DEFAULT NULL::text, _recommended_admin_name text DEFAULT NULL::text, _edited_amount numeric DEFAULT NULL::numeric, _edited_description text DEFAULT NULL::text, _request_title text DEFAULT NULL::text, _requested_by text DEFAULT NULL::text, _amount numeric DEFAULT NULL::numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    updated_at = now()
  RETURNING * INTO _row;

  RETURN jsonb_build_object('ok', true, 'review', to_jsonb(_row));
END;
$function$;

-- Notify procurement when a meal plan / per diem / provider request is submitted
CREATE OR REPLACE FUNCTION public.notify_procurement_review_on_provider_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM net.http_post(
    url := 'https://pudfybkyfedeggmokhco.supabase.co/functions/v1/procurement-review-notify',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{"mode": "scan"}'::jsonb
  );
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_notify_procurement_review_provider ON public.provider_submission_requests;
CREATE TRIGGER trg_notify_procurement_review_provider
AFTER INSERT ON public.provider_submission_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_procurement_review_on_provider_request();