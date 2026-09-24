GRANT INSERT, UPDATE ON public.birthday_wishes TO authenticated;

CREATE POLICY "Employees send their own valid birthday wishes"
ON public.birthday_wishes
FOR INSERT TO authenticated
WITH CHECK (
  sender_employee_id IN (
    SELECT id FROM public.employees
    WHERE auth_user_id = auth.uid()
      AND lower(status) = 'active'
      AND COALESCE(disabled, false) = false
  )
  AND recipient_employee_id IN (
    SELECT id FROM public.employees
    WHERE lower(status) = 'active'
      AND COALESCE(disabled, false) = false
      AND date_of_birth IS NOT NULL
      AND EXTRACT(MONTH FROM date_of_birth) = EXTRACT(MONTH FROM (now() AT TIME ZONE 'Africa/Kampala')::date)
      AND EXTRACT(DAY FROM date_of_birth) = EXTRACT(DAY FROM (now() AT TIME ZONE 'Africa/Kampala')::date)
  )
);

CREATE POLICY "Recipients mark their birthday wishes seen"
ON public.birthday_wishes
FOR UPDATE TO authenticated
USING (
  recipient_employee_id IN (SELECT id FROM public.employees WHERE auth_user_id = auth.uid())
)
WITH CHECK (
  recipient_employee_id IN (SELECT id FROM public.employees WHERE auth_user_id = auth.uid())
);

ALTER FUNCTION public.get_today_birthday_colleagues() SECURITY INVOKER;
ALTER FUNCTION public.send_birthday_wish(uuid) SECURITY INVOKER;
ALTER FUNCTION public.get_my_unseen_birthday_wishes() SECURITY INVOKER;
ALTER FUNCTION public.mark_my_birthday_wishes_seen(uuid[]) SECURITY INVOKER;