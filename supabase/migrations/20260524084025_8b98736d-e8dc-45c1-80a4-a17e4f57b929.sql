CREATE OR REPLACE FUNCTION public.identify_face_descriptor(p_descriptor jsonb)
RETURNS TABLE(user_id uuid, email text, distance double precision)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  r RECORD;
  v_sum DOUBLE PRECISION;
  v_diff DOUBLE PRECISION;
  i INT;
  v_dist DOUBLE PRECISION;
  v_best_dist DOUBLE PRECISION := 9999;
  v_best_user UUID;
  v_best_email TEXT;
  v_len INT := jsonb_array_length(p_descriptor);
BEGIN
  FOR r IN SELECT fc.user_id, fc.email, fc.descriptor FROM public.face_credentials fc LOOP
    IF jsonb_array_length(r.descriptor) <> v_len THEN
      CONTINUE;
    END IF;
    v_sum := 0;
    FOR i IN 0..v_len - 1 LOOP
      v_diff := (r.descriptor->>i)::DOUBLE PRECISION - (p_descriptor->>i)::DOUBLE PRECISION;
      v_sum := v_sum + (v_diff * v_diff);
    END LOOP;
    v_dist := sqrt(v_sum);
    IF v_dist < v_best_dist THEN
      v_best_dist := v_dist;
      v_best_user := r.user_id;
      v_best_email := r.email;
    END IF;
  END LOOP;

  IF v_best_user IS NOT NULL AND v_best_dist <= 0.5 THEN
    UPDATE public.face_credentials SET last_used_at = now() WHERE user_id = v_best_user;
    RETURN QUERY SELECT v_best_user, v_best_email, v_best_dist;
  END IF;
  RETURN;
END;
$function$;