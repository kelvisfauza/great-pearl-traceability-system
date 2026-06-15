ALTER TABLE public.employees DISABLE TRIGGER prevent_employee_self_privilege_escalation_trg;
ALTER TABLE public.employees DISABLE TRIGGER trg_enforce_employee_role_lock;
ALTER TABLE public.employees DISABLE TRIGGER trg_prevent_employee_priv_escalation;
ALTER TABLE public.employees DISABLE TRIGGER trg_prevent_employee_privilege_escalation;
ALTER TABLE public.employees DISABLE TRIGGER trg_prevent_employee_self_escalation;
ALTER TABLE public.employees DISABLE TRIGGER trg_prevent_non_admin_role_escalation;
ALTER TABLE public.employees DISABLE TRIGGER trg_prevent_role_escalation;

UPDATE public.employees
SET disabled = true,
    status = 'On Leave',
    updated_at = now()
WHERE email = 'tumwinealex@greatpearlcoffee.com';

ALTER TABLE public.employees ENABLE TRIGGER prevent_employee_self_privilege_escalation_trg;
ALTER TABLE public.employees ENABLE TRIGGER trg_enforce_employee_role_lock;
ALTER TABLE public.employees ENABLE TRIGGER trg_prevent_employee_priv_escalation;
ALTER TABLE public.employees ENABLE TRIGGER trg_prevent_employee_privilege_escalation;
ALTER TABLE public.employees ENABLE TRIGGER trg_prevent_employee_self_escalation;
ALTER TABLE public.employees ENABLE TRIGGER trg_prevent_non_admin_role_escalation;
ALTER TABLE public.employees ENABLE TRIGGER trg_prevent_role_escalation;