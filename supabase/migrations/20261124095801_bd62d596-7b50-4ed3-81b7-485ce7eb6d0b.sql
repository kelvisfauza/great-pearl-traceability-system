CREATE OR REPLACE FUNCTION public.set_maintenance_mode(
  p_activate boolean,
  p_reason text DEFAULT NULL,
  p_activated_by text DEFAULT NULL,
  p_expected_back_online timestamptz DEFAULT NULL,
  p_recovery_key text DEFAULT NULL,
  p_recovery_pin text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  rec public.system_maintenance%ROWTYPE;
BEGIN
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Only active administrators can change maintenance mode';
  END IF;

  SELECT * INTO rec FROM public.system_maintenance
  ORDER BY is_active DESC, updated_at DESC, created_at DESC
  LIMIT 1;

  IF rec.id IS NULL THEN
    RAISE EXCEPTION 'No maintenance record found';
  END IF;

  UPDATE public.system_maintenance SET
    is_active = p_activate,
    reason = CASE WHEN p_activate THEN COALESCE(p_reason, 'System maintenance in progress') ELSE NULL END,
    activated_by = CASE WHEN p_activate THEN COALESCE(p_activated_by, 'Admin') ELSE NULL END,
    activated_at = CASE WHEN p_activate THEN now() ELSE NULL END,
    recovery_key = CASE WHEN p_activate THEN p_recovery_key ELSE NULL END,
    recovery_pin = CASE WHEN p_activate THEN p_recovery_pin ELSE NULL END,
    recovery_sms_sent = false,
    expected_back_online = CASE WHEN p_activate THEN p_expected_back_online ELSE NULL END,
    updated_at = now()
  WHERE id = rec.id;

  RETURN jsonb_build_object('ok', true, 'id', rec.id, 'is_active', p_activate);
END;
$function$;

REVOKE ALL ON FUNCTION public.set_maintenance_mode(boolean, text, text, timestamptz, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_maintenance_mode(boolean, text, text, timestamptz, text, text) TO authenticated;