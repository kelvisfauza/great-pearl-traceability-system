
-- Update the insert_quality_assessment function to check for duplicates
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
  -- Check if the current user has permission
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
  
  -- Check for existing assessment for this coffee record (prevent duplicates)
  SELECT id INTO existing_id
  FROM public.quality_assessments
  WHERE store_record_id = (assessment_data->>'store_record_id')::text
  AND status IN ('approved', 'pending_admin_pricing', 'submitted_to_finance')
  LIMIT 1;
  
  IF existing_id IS NOT NULL THEN
    RAISE EXCEPTION 'A quality assessment already exists for this coffee lot (ID: %). Please check existing assessments.', existing_id;
  END IF;
  
  -- Insert the assessment
  INSERT INTO public.quality_assessments (
    store_record_id,
    batch_number,
    moisture,
    group1_defects,
    group2_defects,
    below12,
    pods,
    husks,
    stones,
    fm,
    clean_d14,
    outturn,
    outturn_price,
    final_price,
    quality_note,
    reject_outturn_price,
    reject_final,
    suggested_price,
    status,
    comments,
    date_assessed,
    assessed_by
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
    assessment_data->>'assessed_by'
  )
  RETURNING to_jsonb(quality_assessments.*) INTO result;
  
  RETURN result;
END;
$function$;
