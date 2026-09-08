INSERT INTO public.system_settings (setting_key, setting_value)
VALUES ('sunday_withdrawals', '{"enabled": true}'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.get_sunday_withdrawals_enabled()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT (setting_value->>'enabled')::boolean
       FROM public.system_settings
      WHERE setting_key = 'sunday_withdrawals'),
    true
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_sunday_withdrawals_enabled() TO authenticated;