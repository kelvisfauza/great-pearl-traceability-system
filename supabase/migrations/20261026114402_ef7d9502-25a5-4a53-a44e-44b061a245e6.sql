CREATE OR REPLACE FUNCTION public.verify_by_code(_code text)
RETURNS TABLE(id uuid, code text, type text, subtype text, status text, issued_to_name text, employee_no text, "position" text, department text, workstation text, issued_at timestamptz, valid_until timestamptz, reference_no text, meta jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $function$
WITH input AS (
 SELECT upper(regexp_replace(trim(coalesce(_code,'')), '[[:space:]]+', '-', 'g')) AS code
), candidates AS (
 SELECT 0 AS priority, v.id, v.code, v.type, v.subtype, v.status, v.issued_to_name, v.employee_no, v."position", v.department, v.workstation, v.issued_at, v.valid_until, v.reference_no,
 CASE WHEN v.subtype='daily_coffee_prices' THEN v.meta::jsonb
 WHEN v.subtype='system_print' THEN jsonb_build_object('title',v.meta->>'title','printed_by',v.meta->>'printed_by','verification_scope',v.meta->>'verification_scope') ELSE NULL::jsonb END AS meta
 FROM public.verifications v,input i WHERE upper(v.code)=i.code
 UNION ALL
 SELECT 1, q.id, upper(regexp_replace(q.form_number,'[[:space:]]+','-','g')), 'document', 'quality_analysis_form', 'verified', 'Quality Department', NULL::text,NULL::text,'Quality',NULL::text,q.created_at,NULL::timestamptz,q.form_number,
 jsonb_build_object('title','Quality Analysis Form','verification_scope','Confirms this form number was issued by Great Agro Coffee. Does not verify handwritten entries, analysis results, payment or approval.')
 FROM public.quality_form_numbers q,input i WHERE upper(regexp_replace(q.form_number,'[[:space:]]+','-','g'))=i.code AND q.issued_by IS NOT NULL
 UNION ALL
 SELECT 2, f.id, f.verification_code, 'document', 'quality_analysis_form', 'verified', 'Quality Department',NULL::text,NULL::text,'Quality',NULL::text,f.created_at,NULL::timestamptz,f.form_number,
 jsonb_build_object('title','Quality Analysis Form','verification_scope','Confirms this form was registered by Great Agro Coffee. Does not verify handwritten entries, analysis results, payment or approval.')
 FROM public.quality_analysis_forms f,input i WHERE upper(f.verification_code)=i.code AND f.created_by IS NOT NULL
 UNION ALL
 SELECT 3,s.id,upper(regexp_replace(s.form_number,'[[:space:]]+','-','g')),'document','store_report_form','verified','Store Department',NULL::text,NULL::text,'Store',NULL::text,s.created_at,NULL::timestamptz,s.form_number,
 jsonb_build_object('title','Store Report Form','verification_scope','Confirms this form number was issued by Great Agro Coffee. Does not verify handwritten entries, stock balances, payment or approval.')
 FROM public.store_report_form_numbers s,input i WHERE upper(regexp_replace(s.form_number,'[[:space:]]+','-','g'))=i.code AND s.issued_by IS NOT NULL
)
SELECT c.id,c.code,c.type,c.subtype,c.status,c.issued_to_name,c.employee_no,c."position",c.department,c.workstation,c.issued_at,c.valid_until,c.reference_no,c.meta FROM candidates c ORDER BY c.priority,c.id LIMIT 1;
$function$;
REVOKE ALL ON FUNCTION public.verify_by_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_by_code(text) TO anon,authenticated,service_role;