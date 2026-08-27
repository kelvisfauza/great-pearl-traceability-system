ALTER TABLE public.employees DISABLE TRIGGER trg_prevent_non_admin_role_escalation;

UPDATE public.employees
SET permissions = (
  SELECT array_agg(DISTINCT p ORDER BY p) FROM unnest(
    (SELECT array_agg(x) FROM unnest(permissions) AS x
      WHERE x NOT IN ('Finance:process','Finance:approve','Finance:edit'))
    || ARRAY['Finance:view','Finance:create']
  ) AS p
),
updated_at = now()
WHERE email = 'nickscott@greatpearlcoffee.com';

ALTER TABLE public.employees ENABLE TRIGGER trg_prevent_non_admin_role_escalation;