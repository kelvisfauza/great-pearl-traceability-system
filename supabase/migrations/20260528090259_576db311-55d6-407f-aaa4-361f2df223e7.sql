INSERT INTO public.system_settings (setting_key, setting_value)
VALUES ('withdrawal_limits', '{"per_transaction": null, "daily": null}'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;