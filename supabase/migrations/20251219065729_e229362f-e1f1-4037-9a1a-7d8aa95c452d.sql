-- Create system_settings table for feature toggles
CREATE TABLE public.system_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL DEFAULT '{}',
  description TEXT,
  updated_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read settings
CREATE POLICY "Anyone can read system settings"
ON public.system_settings
FOR SELECT
USING (true);

-- Only admins can modify settings (we'll control this in the app layer)
CREATE POLICY "Authenticated users can update system settings"
ON public.system_settings
FOR UPDATE
USING (true);

CREATE POLICY "Authenticated users can insert system settings"
ON public.system_settings
FOR INSERT
WITH CHECK (true);

-- Insert default settings for report reminders
INSERT INTO public.system_settings (setting_key, setting_value, description)
VALUES (
  'report_reminders',
  '{"daily_report_reminder": true, "morning_report_reminder": true, "analyst_report_reminder": true}',
  'Controls whether SMS reminders are sent for daily reports, missed reports, and analyst market reports'
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_system_settings_updated_at
BEFORE UPDATE ON public.system_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();