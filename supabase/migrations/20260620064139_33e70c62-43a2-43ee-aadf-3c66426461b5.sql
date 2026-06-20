ALTER TABLE public.user_roles DISABLE TRIGGER trg_guard_user_roles;

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'Administrator'::app_role
FROM auth.users u
WHERE u.email = 'musemawyclif@greatpearlcoffee.com'
ON CONFLICT (user_id, role) DO NOTHING;

ALTER TABLE public.user_roles ENABLE TRIGGER trg_guard_user_roles;