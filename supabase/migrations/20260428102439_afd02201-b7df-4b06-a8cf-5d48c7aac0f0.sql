
INSERT INTO public.system_settings (setting_key, setting_value)
VALUES (
  'instant_withdrawal_throttle',
  jsonb_build_object(
    'enabled', true,
    'daily_cap', 100000,
    'active_until', (now() + interval '3 days')::text,
    'reason', 'Temporary 100k/24h instant withdrawal cap for non-admin users (3-day window).'
  )
)
ON CONFLICT (setting_key) DO UPDATE
  SET setting_value = EXCLUDED.setting_value,
      updated_at = now();
