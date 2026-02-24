-- Add recovery_pin column
ALTER TABLE public.system_maintenance ADD COLUMN IF NOT EXISTS recovery_pin text;
ALTER TABLE public.system_maintenance ADD COLUMN IF NOT EXISTS recovery_sms_sent boolean DEFAULT false;
ALTER TABLE public.system_maintenance ADD COLUMN IF NOT EXISTS recovery_phone text;

-- Make recovery_key nullable
ALTER TABLE public.system_maintenance ALTER COLUMN recovery_key DROP NOT NULL;

-- Clear old values
UPDATE public.system_maintenance SET recovery_key = NULL, recovery_pin = NULL;