-- Each check must return true; this lookup does not grant general meal registry access.
select
  not (select prosecdef from pg_proc where oid = 'public.lookup_issued_meal_form(text)'::regprocedure) as public_entry_is_invoker,
  not has_function_privilege('anon', 'public.lookup_issued_meal_form(text)', 'EXECUTE') as anonymous_lookup_denied,
  has_function_privilege('authenticated', 'public.lookup_issued_meal_form(text)', 'EXECUTE') as signed_in_entry_available,
  position('auth.uid() IS NULL' in pg_get_functiondef('meal_document_lookup_private.lookup_issued_meal_form(text)'::regprocedure)) > 0 as signin_checked,
  position('disabled' in pg_get_functiondef('meal_document_lookup_private.lookup_issued_meal_form(text)'::regprocedure)) > 0 as disabled_staff_checked,
  position('user_has_permission' in pg_get_functiondef('meal_document_lookup_private.lookup_issued_meal_form(text)'::regprocedure)) > 0 as finance_permission_checked;