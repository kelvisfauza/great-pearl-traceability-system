CREATE OR REPLACE FUNCTION public.issue_quality_form_numbers(p_count integer DEFAULT 1, p_issued_by_name text DEFAULT NULL::text)
 RETURNS text[]
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_period text := to_char(now() AT TIME ZONE 'Africa/Kampala', 'YYYYMM');
  v_short text := to_char(now() AT TIME ZONE 'Africa/Kampala', 'YYMM');
  v_next integer;
  v_out text[] := ARRAY[]::text[];
  v_num text;
  i integer;
BEGIN
  IF p_count IS NULL OR p_count < 1 THEN p_count := 1; END IF;
  IF p_count > 100 THEN p_count := 100; END IF;

  PERFORM pg_advisory_xact_lock(hashtext('quality_form_numbers_' || v_period));

  SELECT COALESCE(MAX(seq), 0) + 1 INTO v_next
  FROM public.quality_form_numbers WHERE period_key = v_period;

  FOR i IN 0..(p_count - 1) LOOP
    v_num := 'GAC QA ' || v_short || '-' || lpad((v_next + i)::text, 4, '0');
    INSERT INTO public.quality_form_numbers (form_number, period_key, seq, issued_by, issued_by_name)
    VALUES (v_num, v_period, v_next + i, auth.uid(), p_issued_by_name);
    v_out := array_append(v_out, v_num);
  END LOOP;

  RETURN v_out;
END;
$function$;