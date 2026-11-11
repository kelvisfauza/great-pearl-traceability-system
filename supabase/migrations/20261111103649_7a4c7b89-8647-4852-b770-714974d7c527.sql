CREATE OR REPLACE FUNCTION public.display_public_staff()
RETURNS TABLE(id uuid, name text, department text, "position" text, avatar_url text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT e.id, e.name, e.department, e.position,
         CASE WHEN e.avatar_url LIKE '/__l5e/%' OR e.avatar_url LIKE 'https://%lovable%' THEN e.avatar_url ELSE NULL END
  FROM public.employees e
  WHERE lower(e.status) = 'active' AND coalesce(e.disabled,false) = false
  ORDER BY e.department, e.name;
$$;