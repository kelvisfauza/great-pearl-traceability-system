
CREATE OR REPLACE FUNCTION public.user_has_permission(permission_name text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.employees e
    WHERE (
      e.auth_user_id = auth.uid()
      OR lower(e.email) = lower(auth.jwt() ->> 'email')
    )
    AND e.status = 'Active'
    AND COALESCE(e.disabled, false) = false
    AND (
      e.role = 'Super Admin'
      OR e.permissions @> ARRAY['*']::text[]
      OR e.permissions @> ARRAY[permission_name]::text[]
      -- Match any granular variant like "Quality Control:view"
      OR EXISTS (
        SELECT 1
        FROM unnest(e.permissions) AS p
        WHERE p LIKE permission_name || ':%'
      )
    )
  );
$function$;
