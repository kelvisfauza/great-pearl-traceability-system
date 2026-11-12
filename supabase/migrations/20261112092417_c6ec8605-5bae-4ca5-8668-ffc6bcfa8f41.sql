CREATE OR REPLACE FUNCTION public.admin_overdraft_set_limit(p_account_id uuid, p_limit numeric, p_admin_email text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (public.is_current_user_admin() OR public.is_finance_or_admin()) THEN
    RAISE EXCEPTION 'Only administrators can change overdraft limits';
  END IF;
  UPDATE public.overdraft_accounts
     SET approved_limit = GREATEST(0, p_limit),
         auto_managed = false,
         approved_by = COALESCE(public.current_user_email(), p_admin_email) || ':manual',
         updated_at = now()
   WHERE id = p_account_id;
  RETURN jsonb_build_object('ok', FOUND);
END; $function$;

DO $$ DECLARE def text; BEGIN
  FOR def IN SELECT pg_get_functiondef(p.oid) FROM pg_proc p
    WHERE p.oid IN ('public.admin_overdraft_unfreeze(uuid,text)'::regprocedure, 'public.admin_overdraft_close(uuid,text)'::regprocedure)
  LOOP
    IF def NOT LIKE '%Only administrators can manage overdrafts%' THEN
      def := regexp_replace(def, 'BEGIN', 'BEGIN
  IF NOT (public.is_current_user_admin() OR public.is_finance_or_admin()) THEN
    RAISE EXCEPTION ''Only administrators can manage overdrafts'';
  END IF;', '');
      EXECUTE def;
    END IF;
  END LOOP;
END $$;

REVOKE EXECUTE ON FUNCTION public.admin_overdraft_set_limit(uuid,numeric,text), public.admin_overdraft_unfreeze(uuid,text), public.admin_overdraft_close(uuid,text) FROM PUBLIC, anon;