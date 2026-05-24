CREATE OR REPLACE FUNCTION public.verify_face_descriptor(
  p_email TEXT,
  p_descriptor JSONB
)
RETURNS UUID
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stored JSONB;
  v_user_id UUID;
  v_sum DOUBLE PRECISION := 0;
  v_diff DOUBLE PRECISION;
  i INT;
  v_dist DOUBLE PRECISION;
BEGIN
  SELECT descriptor, user_id INTO v_stored, v_user_id
  FROM public.face_credentials
  WHERE lower(email) = lower(p_email)
  LIMIT 1;

  IF v_stored IS NULL THEN
    RETURN NULL;
  END IF;

  IF jsonb_array_length(v_stored) <> jsonb_array_length(p_descriptor) THEN
    RETURN NULL;
  END IF;

  FOR i IN 0..jsonb_array_length(v_stored) - 1 LOOP
    v_diff := (v_stored->>i)::DOUBLE PRECISION - (p_descriptor->>i)::DOUBLE PRECISION;
    v_sum := v_sum + (v_diff * v_diff);
  END LOOP;

  v_dist := sqrt(v_sum);

  IF v_dist <= 0.5 THEN
    UPDATE public.face_credentials
       SET last_used_at = now()
     WHERE user_id = v_user_id;
    RETURN v_user_id;
  END IF;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.identify_face_descriptor(p_descriptor jsonb)
RETURNS TABLE(matched_user_id uuid, matched_email text, distance double precision)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
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
  FOR r IN
    SELECT fc.user_id AS uid, fc.email AS em, fc.descriptor AS d
    FROM public.face_credentials fc
  LOOP
    IF jsonb_array_length(r.d) <> v_len THEN
      CONTINUE;
    END IF;

    v_sum := 0;
    FOR i IN 0..v_len - 1 LOOP
      v_diff := (r.d->>i)::DOUBLE PRECISION - (p_descriptor->>i)::DOUBLE PRECISION;
      v_sum := v_sum + (v_diff * v_diff);
    END LOOP;

    v_dist := sqrt(v_sum);
    IF v_dist < v_best_dist THEN
      v_best_dist := v_dist;
      v_best_user := r.uid;
      v_best_email := r.em;
    END IF;
  END LOOP;

  IF v_best_user IS NOT NULL AND v_best_dist <= 0.6 THEN
    UPDATE public.face_credentials
    SET last_used_at = now()
    WHERE user_id = v_best_user;

    RETURN QUERY SELECT v_best_user, v_best_email, v_best_dist;
  END IF;

  RETURN;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.verify_face_descriptor(TEXT, JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.identify_face_descriptor(JSONB) TO anon, authenticated;