CREATE OR REPLACE FUNCTION public.protect_birthday_wish_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_sender public.employees%ROWTYPE;
  v_today date := (now() AT TIME ZONE 'Africa/Kampala')::date;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT * INTO v_sender
    FROM public.employees
    WHERE auth_user_id = auth.uid()
      AND lower(status) = 'active'
      AND COALESCE(disabled, false) = false
    LIMIT 1;

    IF v_sender.id IS NULL THEN
      RAISE EXCEPTION 'Your employee account could not be found.';
    END IF;

    NEW.sender_employee_id := v_sender.id;
    NEW.sender_name := v_sender.name;
    NEW.birthday_year := EXTRACT(YEAR FROM v_today)::integer;
    NEW.seen_at := NULL;
  ELSE
    IF NEW.recipient_employee_id IS DISTINCT FROM OLD.recipient_employee_id
       OR NEW.sender_employee_id IS DISTINCT FROM OLD.sender_employee_id
       OR NEW.sender_name IS DISTINCT FROM OLD.sender_name
       OR NEW.birthday_year IS DISTINCT FROM OLD.birthday_year
       OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'Birthday wish identity fields cannot be changed.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER birthday_wishes_protect_fields
BEFORE INSERT OR UPDATE ON public.birthday_wishes
FOR EACH ROW EXECUTE FUNCTION public.protect_birthday_wish_fields();

REVOKE ALL ON FUNCTION public.protect_birthday_wish_fields() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.protect_birthday_wish_fields() TO authenticated;
GRANT EXECUTE ON FUNCTION public.protect_birthday_wish_fields() TO service_role;