INSERT INTO public.ussd_services (service_key, name, display_order, is_active)
VALUES ('5', 'Deposit to Wallet', 5, true)
ON CONFLICT (service_key) DO UPDATE SET name = EXCLUDED.name, display_order = EXCLUDED.display_order, is_active = true;