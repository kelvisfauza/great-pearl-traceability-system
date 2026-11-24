CREATE OR REPLACE FUNCTION public.mark_maintenance_recovery_sms(p_id uuid, p_phone text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Only active administrators can update maintenance mode';
  END IF;

  UPDATE public.system_maintenance SET
    recovery_sms_sent = true,
    recovery_phone = p_phone,
    updated_at = now()
  WHERE id = p_id;

  RETURN jsonb_build_object('ok', true);
END;
$function$;

REVOKE ALL ON FUNCTION public.mark_maintenance_recovery_sms(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_maintenance_recovery_sms(uuid, text) TO authenticated;