CREATE OR REPLACE FUNCTION public.lookup_issued_meal_form(p_number text)
RETURNS TABLE(document_number text, created_at timestamptz, printed_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS (SELECT 1 FROM public.employees e WHERE lower(e.email)=lower(auth.jwt()->>'email') AND coalesce(e.disabled,false)=false) OR NOT (public.user_has_permission('Finance') OR public.is_current_user_admin() OR public.is_procurement_reviewer(auth.uid())) THEN
  RAISE EXCEPTION 'Not permitted to view meal-form issuance' USING ERRCODE='42501';
 END IF;
 RETURN QUERY SELECT f.document_number,f.created_at,f.printed_at FROM public.meal_plan_forms f WHERE f.document_number=upper(regexp_replace(trim(p_number),'[[:space:]]+','-','g'));
END;
$$;
REVOKE ALL ON FUNCTION public.lookup_issued_meal_form(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.lookup_issued_meal_form(text) TO authenticated;
