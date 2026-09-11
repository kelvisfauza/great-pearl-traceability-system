ALTER TABLE public.quality_sampling_orders
  ADD COLUMN IF NOT EXISTS received_grams numeric,
  ADD COLUMN IF NOT EXISTS received_at timestamptz,
  ADD COLUMN IF NOT EXISTS received_by text,
  ADD COLUMN IF NOT EXISTS received_observation text,
  ADD COLUMN IF NOT EXISTS linked_batch_number text,
  ADD COLUMN IF NOT EXISTS linked_store_record_id text,
  ADD COLUMN IF NOT EXISTS linked_at timestamptz;

ALTER TABLE public.quality_assessments
  ADD COLUMN IF NOT EXISTS sampling_order_id uuid,
  ADD COLUMN IF NOT EXISTS sampling_order_number text;

CREATE INDEX IF NOT EXISTS idx_quality_sampling_orders_supplier_lower ON public.quality_sampling_orders (lower(supplier_name));
CREATE INDEX IF NOT EXISTS idx_quality_assessments_sampling_order ON public.quality_assessments (sampling_order_id);

CREATE OR REPLACE FUNCTION public.insert_quality_assessment(assessment_data jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
  user_has_permission boolean;
  existing_id uuid;
BEGIN
  SELECT EXISTS (
    SELECT 1 
    FROM public.employees 
    WHERE employees.auth_user_id = auth.uid()
    AND employees.status = 'Active'
    AND (
      employees.role = 'Super Admin'
      OR employees.role = 'Administrator'
      OR 'Quality Control:create' = ANY(employees.permissions)
      OR 'Quality Control' = ANY(employees.permissions)
    )
  ) INTO user_has_permission;

  IF NOT user_has_permission THEN
    RAISE EXCEPTION 'User does not have permission to create quality assessments';
  END IF;

  SELECT id INTO existing_id
  FROM public.quality_assessments
  WHERE store_record_id = (assessment_data->>'store_record_id')::text
  AND status IN ('approved', 'pending_admin_pricing', 'submitted_to_finance')
  LIMIT 1;

  IF existing_id IS NOT NULL THEN
    RAISE EXCEPTION 'A quality assessment already exists for this coffee lot (ID: %). Please check existing assessments.', existing_id;
  END IF;

  INSERT INTO public.quality_assessments (
    store_record_id, batch_number, moisture, group1_defects, group2_defects,
    below12, pods, husks, stones, fm, clean_d14, outturn, outturn_price,
    final_price, quality_note, reject_outturn_price, reject_final,
    suggested_price, status, comments, date_assessed, assessed_by,
    physical_assessment_by, system_assessment_by, form_number,
    sampling_order_id, sampling_order_number
  )
  VALUES (
    (assessment_data->>'store_record_id')::text,
    assessment_data->>'batch_number',
    (assessment_data->>'moisture')::numeric,
    (assessment_data->>'group1_defects')::numeric,
    (assessment_data->>'group2_defects')::numeric,
    (assessment_data->>'below12')::numeric,
    (assessment_data->>'pods')::numeric,
    (assessment_data->>'husks')::numeric,
    (assessment_data->>'stones')::numeric,
    (assessment_data->>'fm')::numeric,
    (assessment_data->>'clean_d14')::numeric,
    (assessment_data->>'outturn')::numeric,
    (assessment_data->>'outturn_price')::numeric,
    (assessment_data->>'final_price')::numeric,
    assessment_data->>'quality_note',
    (assessment_data->>'reject_outturn_price')::boolean,
    (assessment_data->>'reject_final')::boolean,
    (assessment_data->>'suggested_price')::numeric,
    assessment_data->>'status',
    assessment_data->>'comments',
    (assessment_data->>'date_assessed')::date,
    assessment_data->>'assessed_by',
    assessment_data->>'physical_assessment_by',
    assessment_data->>'system_assessment_by',
    assessment_data->>'form_number',
    NULLIF(assessment_data->>'sampling_order_id','')::uuid,
    NULLIF(assessment_data->>'sampling_order_number','')
  )
  RETURNING to_jsonb(quality_assessments.*) INTO result;

  -- Link the sampling order back to this assessment
  IF NULLIF(assessment_data->>'sampling_order_id','') IS NOT NULL THEN
    UPDATE public.quality_sampling_orders
    SET linked_batch_number = assessment_data->>'batch_number',
        linked_store_record_id = assessment_data->>'store_record_id',
        linked_at = now(),
        status = 'assessed',
        assessed_by = COALESCE(assessed_by, assessment_data->>'assessed_by'),
        assessed_at = COALESCE(assessed_at, now()),
        updated_at = now()
    WHERE id = (assessment_data->>'sampling_order_id')::uuid;
  END IF;

  RETURN result;
END;
$function$;