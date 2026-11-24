CREATE OR REPLACE FUNCTION public.selected_staff_module_access(p_modules text[])
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public AS $$
 SELECT public.is_active_staff() AND (
  EXISTS(SELECT 1 FROM public.user_roles ur WHERE ur.user_id=auth.uid() AND replace(lower(ur.role),' ','_') IN ('admin','administrator','super_admin')) OR
  EXISTS(SELECT 1 FROM public.employees e CROSS JOIN LATERAL unnest(coalesce(e.permissions,ARRAY[]::text[])) p(permission)
   WHERE lower(e.email)=lower(auth.jwt()->>'email') AND (p.permission IN ('*','Administration') OR EXISTS(
    SELECT 1 FROM unnest(p_modules) m(module) WHERE p.permission=m.module OR left(p.permission,length(m.module)+1)=m.module||':')))
 );
$$;