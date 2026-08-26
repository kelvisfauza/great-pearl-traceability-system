ALTER TABLE public.employees DISABLE TRIGGER USER;

UPDATE public.employee_role_locks
SET permissions = (SELECT array_agg(DISTINCT p) FROM unnest(permissions || ARRAY['Finance:view','Finance:create']) p)
WHERE email ILIKE 'tatwanzire%';

UPDATE public.employees
SET permissions = (SELECT array_agg(DISTINCT p) FROM unnest(permissions || ARRAY['Finance:view','Finance:create']) p),
    updated_at = now()
WHERE email ILIKE 'tatwanzire%';

ALTER TABLE public.employees ENABLE TRIGGER USER;