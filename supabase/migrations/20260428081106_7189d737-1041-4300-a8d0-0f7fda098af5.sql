CREATE TABLE IF NOT EXISTS public.system_settings (
  setting_key text PRIMARY KEY,
  setting_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "system_settings_read_all_auth" ON public.system_settings;
CREATE POLICY "system_settings_read_all_auth"
  ON public.system_settings FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "system_settings_admin_write" ON public.system_settings;
CREATE POLICY "system_settings_admin_write"
  ON public.system_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.email = (auth.jwt()->>'email')
        AND (e.role IN ('Administrator','Admin','admin') OR e.department IN ('Administration','Finance'))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.email = (auth.jwt()->>'email')
        AND (e.role IN ('Administrator','Admin','admin') OR e.department IN ('Administration','Finance'))
    )
  );

INSERT INTO public.system_settings (setting_key, setting_value)
VALUES ('withdrawal_control', '{"disabled": false, "disabled_until": null, "disabled_reason": ""}'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;