CREATE OR REPLACE FUNCTION public.enforce_finance_release_sod()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_email text; v_name text;
BEGIN
  IF COALESCE(NEW.finance_approved,false) AND NOT COALESCE(OLD.finance_approved,false)
     AND COALESCE(NEW.finance_approved_by,'') NOT ILIKE 'AUTO%'
     AND auth.uid() IS NOT NULL THEN
    SELECT email, name INTO v_email, v_name FROM employees WHERE auth_user_id = auth.uid() LIMIT 1;
    IF v_email IS NOT NULL AND lower(v_email) = lower(COALESCE(NEW.requestedby,'')) THEN
      RAISE EXCEPTION 'You cannot release your own request' USING ERRCODE='P0001';
    END IF;
    IF v_name IS NOT NULL AND v_name IN (COALESCE(NEW.admin_approved_1_by,''), COALESCE(NEW.admin_approved_2_by,''), COALESCE(NEW.admin_approved_by,''), COALESCE(NEW.admin_final_approval_by,'')) THEN
      RAISE EXCEPTION 'You approved this as Admin — a different person must release it as Finance' USING ERRCODE='P0001';
    END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.enforce_finance_release_sod() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_enforce_finance_release_sod ON public.approval_requests;
CREATE TRIGGER trg_enforce_finance_release_sod BEFORE UPDATE ON public.approval_requests
FOR EACH ROW EXECUTE FUNCTION public.enforce_finance_release_sod();