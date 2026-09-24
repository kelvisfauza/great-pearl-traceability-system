CREATE TABLE public.birthday_wishes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  sender_employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  sender_name text NOT NULL,
  birthday_year integer NOT NULL,
  seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT birthday_wishes_one_per_year UNIQUE (recipient_employee_id, sender_employee_id, birthday_year),
  CONSTRAINT birthday_wishes_not_self CHECK (recipient_employee_id <> sender_employee_id)
);

GRANT SELECT ON public.birthday_wishes TO authenticated;
GRANT ALL ON public.birthday_wishes TO service_role;

ALTER TABLE public.birthday_wishes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees view sent or received birthday wishes"
ON public.birthday_wishes
FOR SELECT TO authenticated
USING (
  sender_employee_id IN (SELECT id FROM public.employees WHERE auth_user_id = auth.uid())
  OR recipient_employee_id IN (SELECT id FROM public.employees WHERE auth_user_id = auth.uid())
  OR public.is_current_user_admin()
);

CREATE POLICY "Service role manages birthday wishes"
ON public.birthday_wishes
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.touch_birthday_wishes_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER birthday_wishes_touch_updated_at
BEFORE UPDATE ON public.birthday_wishes
FOR EACH ROW EXECUTE FUNCTION public.touch_birthday_wishes_updated_at();

CREATE OR REPLACE FUNCTION public.get_today_birthday_colleagues()
RETURNS TABLE (
  employee_id uuid,
  name text,
  avatar_url text,
  department text,
  employee_position text,
  already_wished boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH current_employee AS (
    SELECT id
    FROM public.employees
    WHERE auth_user_id = auth.uid()
      AND lower(status) = 'active'
      AND COALESCE(disabled, false) = false
    LIMIT 1
  ), today_kampala AS (
    SELECT (now() AT TIME ZONE 'Africa/Kampala')::date AS today
  )
  SELECT
    recipient.id,
    recipient.name,
    recipient.avatar_url,
    recipient.department,
    recipient.position AS employee_position,
    EXISTS (
      SELECT 1
      FROM public.birthday_wishes bw
      WHERE bw.recipient_employee_id = recipient.id
        AND bw.sender_employee_id = current_employee.id
        AND bw.birthday_year = EXTRACT(YEAR FROM today_kampala.today)::integer
    )
  FROM public.employees recipient
  CROSS JOIN current_employee
  CROSS JOIN today_kampala
  WHERE recipient.id <> current_employee.id
    AND lower(recipient.status) = 'active'
    AND COALESCE(recipient.disabled, false) = false
    AND recipient.date_of_birth IS NOT NULL
    AND EXTRACT(MONTH FROM recipient.date_of_birth) = EXTRACT(MONTH FROM today_kampala.today)
    AND EXTRACT(DAY FROM recipient.date_of_birth) = EXTRACT(DAY FROM today_kampala.today)
  ORDER BY recipient.name;
$$;

CREATE OR REPLACE FUNCTION public.send_birthday_wish(p_recipient_employee_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender public.employees%ROWTYPE;
  v_recipient public.employees%ROWTYPE;
  v_today date := (now() AT TIME ZONE 'Africa/Kampala')::date;
  v_wish_id uuid;
BEGIN
  SELECT * INTO v_sender
  FROM public.employees
  WHERE auth_user_id = auth.uid()
    AND lower(status) = 'active'
    AND COALESCE(disabled, false) = false
  LIMIT 1;

  IF v_sender.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Your employee account could not be found.');
  END IF;

  SELECT * INTO v_recipient
  FROM public.employees
  WHERE id = p_recipient_employee_id
    AND lower(status) = 'active'
    AND COALESCE(disabled, false) = false;

  IF v_recipient.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'The birthday employee could not be found.');
  END IF;

  IF v_recipient.id = v_sender.id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'You cannot send a birthday wish to yourself.');
  END IF;

  IF v_recipient.date_of_birth IS NULL
     OR EXTRACT(MONTH FROM v_recipient.date_of_birth) <> EXTRACT(MONTH FROM v_today)
     OR EXTRACT(DAY FROM v_recipient.date_of_birth) <> EXTRACT(DAY FROM v_today) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Birthday wishes can only be sent on the employee’s birthday.');
  END IF;

  INSERT INTO public.birthday_wishes (
    recipient_employee_id,
    sender_employee_id,
    sender_name,
    birthday_year
  ) VALUES (
    v_recipient.id,
    v_sender.id,
    v_sender.name,
    EXTRACT(YEAR FROM v_today)::integer
  )
  ON CONFLICT (recipient_employee_id, sender_employee_id, birthday_year)
  DO NOTHING
  RETURNING id INTO v_wish_id;

  IF v_wish_id IS NULL THEN
    RETURN jsonb_build_object('ok', true, 'already_sent', true);
  END IF;

  RETURN jsonb_build_object('ok', true, 'already_sent', false, 'wish_id', v_wish_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_unseen_birthday_wishes()
RETURNS TABLE (
  wish_id uuid,
  sender_name text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT bw.id, bw.sender_name, bw.created_at
  FROM public.birthday_wishes bw
  JOIN public.employees recipient ON recipient.id = bw.recipient_employee_id
  WHERE recipient.auth_user_id = auth.uid()
    AND bw.seen_at IS NULL
  ORDER BY bw.created_at;
$$;

CREATE OR REPLACE FUNCTION public.mark_my_birthday_wishes_seen(p_wish_ids uuid[])
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.birthday_wishes bw
  SET seen_at = now(), updated_at = now()
  FROM public.employees recipient
  WHERE recipient.id = bw.recipient_employee_id
    AND recipient.auth_user_id = auth.uid()
    AND bw.id = ANY(COALESCE(p_wish_ids, ARRAY[]::uuid[]))
    AND bw.seen_at IS NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.get_today_birthday_colleagues() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.send_birthday_wish(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_my_unseen_birthday_wishes() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_my_birthday_wishes_seen(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_today_birthday_colleagues() TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_birthday_wish(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_unseen_birthday_wishes() TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_my_birthday_wishes_seen(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_today_birthday_colleagues() TO service_role;
GRANT EXECUTE ON FUNCTION public.send_birthday_wish(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_my_unseen_birthday_wishes() TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_my_birthday_wishes_seen(uuid[]) TO service_role;

CREATE INDEX birthday_wishes_recipient_unseen_idx
ON public.birthday_wishes (recipient_employee_id, created_at)
WHERE seen_at IS NULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.birthday_wishes;