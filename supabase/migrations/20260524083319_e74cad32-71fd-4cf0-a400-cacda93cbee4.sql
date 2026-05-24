
-- 1) Remove PIN-leaking self-SELECT on admin_initiated_withdrawals
DROP POLICY IF EXISTS "Users can view own admin_initiated_withdrawals"
  ON public.admin_initiated_withdrawals;

-- 2) Restrict market_prices SELECT to authenticated users only
DROP POLICY IF EXISTS "Anyone can view market prices" ON public.market_prices;
CREATE POLICY "Authenticated can view market prices"
  ON public.market_prices
  FOR SELECT
  TO authenticated
  USING (true);

-- 3) Restrict public_holidays SELECT to authenticated users only
DROP POLICY IF EXISTS "Anyone can view holidays" ON public.public_holidays;
CREATE POLICY "Authenticated can view holidays"
  ON public.public_holidays
  FOR SELECT
  TO authenticated
  USING (true);

-- 4) Restrict report_templates SELECT to authenticated users only
DROP POLICY IF EXISTS "Anyone can view report templates" ON public.report_templates;
CREATE POLICY "Authenticated can view active report templates"
  ON public.report_templates
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- 5) Restrict ussd_services SELECT to authenticated users only
DROP POLICY IF EXISTS "Anyone can view ussd services" ON public.ussd_services;
CREATE POLICY "Authenticated can view ussd services"
  ON public.ussd_services
  FOR SELECT
  TO authenticated
  USING (true);

-- 6) Remove auth.users join from chat_conversation_names view
DROP VIEW IF EXISTS public.chat_conversation_names;
CREATE VIEW public.chat_conversation_names
WITH (security_invoker = true) AS
SELECT
  cp.conversation_id,
  cp.user_id,
  COALESCE(e.name, e.email, 'Unknown') AS display_name,
  e.email,
  e.avatar_url
FROM public.conversation_participants cp
LEFT JOIN public.employees e ON e.auth_user_id = cp.user_id;

-- 7) Tighten conversation_participants INSERT — user can only add themselves
DROP POLICY IF EXISTS "participants_insert_authenticated"
  ON public.conversation_participants;
CREATE POLICY "participants_insert_self"
  ON public.conversation_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());
