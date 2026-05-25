CREATE OR REPLACE FUNCTION public.identify_face_descriptor(p_descriptor jsonb)
 RETURNS TABLE(matched_user_id uuid, matched_email text, distance double precision)
 LANGUAGE plpgsql
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
  v_second_dist DOUBLE PRECISION := 9999;
  v_best_user UUID;
  v_best_email TEXT;
  v_len INT := jsonb_array_length(p_descriptor);
  -- Strict acceptance threshold (face-api.js "same person" is ~0.5; we go tighter)
  c_max_dist CONSTANT DOUBLE PRECISION := 0.42;
  -- Required gap between the closest match and the next closest, to avoid
  -- misidentifying lookalike colleagues (e.g. siblings/similar faces).
  c_min_margin CONSTANT DOUBLE PRECISION := 0.10;
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
      v_second_dist := v_best_dist;
      v_best_dist := v_dist;
      v_best_user := r.uid;
      v_best_email := r.em;
    ELSIF v_dist < v_second_dist THEN
      v_second_dist := v_dist;
    END IF;
  END LOOP;

  -- Require: confident absolute match AND clear separation from any other face
  IF v_best_user IS NOT NULL
     AND v_best_dist <= c_max_dist
     AND (v_second_dist - v_best_dist) >= c_min_margin
  THEN
    UPDATE public.face_credentials
    SET last_used_at = now()
    WHERE user_id = v_best_user;

    RETURN QUERY SELECT v_best_user, v_best_email, v_best_dist;
  END IF;

  RETURN;
END;
$function$;

CREATE OR REPLACE FUNCTION public.verify_face_descriptor(p_email text, p_descriptor jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  -- Tightened from 0.5 to 0.45 to reduce false accepts on similar faces
  IF v_dist <= 0.45 THEN
    UPDATE public.face_credentials
       SET last_used_at = now()
     WHERE user_id = v_user_id;
    RETURN v_user_id;
  END IF;

  RETURN NULL;
END;
$function$;