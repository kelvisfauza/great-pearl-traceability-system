CREATE SCHEMA IF NOT EXISTS meal_workflow_private;
REVOKE ALL ON SCHEMA meal_workflow_private FROM PUBLIC,anon;
GRANT USAGE ON SCHEMA meal_workflow_private TO authenticated,service_role;
ALTER FUNCTION public.submit_meal_correction(uuid,integer,numeric,text,text) SET SCHEMA meal_workflow_private;
CREATE FUNCTION public.submit_meal_correction(p_id uuid,p_revision integer,p_amount numeric,p_description text,p_notes text DEFAULT NULL) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path=public AS $$ SELECT meal_workflow_private.submit_meal_correction(p_id,p_revision,p_amount,p_description,p_notes) $$;
REVOKE ALL ON FUNCTION public.submit_meal_correction(uuid,integer,numeric,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.submit_meal_correction(uuid,integer,numeric,text,text) TO authenticated;