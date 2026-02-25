
INSERT INTO public.system_settings (setting_key, setting_value, description, updated_by) 
VALUES (
  'withdrawal_control', 
  '{"disabled": false, "disabled_until": null, "disabled_reason": ""}'::jsonb, 
  'Controls whether employee withdrawals are enabled or disabled', 
  'system'
);
