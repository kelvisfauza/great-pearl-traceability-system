DROP FUNCTION IF EXISTS public.verify_by_code(text);
CREATE FUNCTION public.verify_by_code(_code text)
RETURNS TABLE(id uuid, code text, type text, subtype text, status text, issued_to_name text, employee_no text, "position" text, department text, workstation text, issued_at timestamptz, valid_until timestamptz, reference_no text, meta jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT v.id, v.code, v.type, v.subtype, v.status, v.issued_to_name, v.employee_no, v."position", v.department, v.workstation, v.issued_at, v.valid_until, v.reference_no,
    CASE WHEN v.subtype = 'daily_coffee_prices' THEN v.meta::jsonb ELSE NULL END
  FROM public.verifications v WHERE v.code = _code LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.verify_by_code(text) TO anon, authenticated;