CREATE TABLE IF NOT EXISTS public.notification_channel_prefs (
  template_name TEXT PRIMARY KEY,
  channels TEXT[] NOT NULL DEFAULT ARRAY['email','sms']::text[],
  enabled BOOLEAN NOT NULL DEFAULT true,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_channel_prefs TO authenticated;
GRANT ALL ON public.notification_channel_prefs TO service_role;

ALTER TABLE public.notification_channel_prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage notification channel prefs"
  ON public.notification_channel_prefs
  FOR ALL
  TO authenticated
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

CREATE TRIGGER trg_notification_channel_prefs_updated_at
  BEFORE UPDATE ON public.notification_channel_prefs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();