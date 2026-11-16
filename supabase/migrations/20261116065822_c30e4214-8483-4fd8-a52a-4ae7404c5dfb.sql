CREATE OR REPLACE FUNCTION public.withdrawal_service_charge(p_amount numeric)
 RETURNS numeric LANGUAGE sql STABLE SET search_path TO 'public'
AS $function$ SELECT CASE WHEN p_amount < 500 THEN 0 WHEN p_amount <= 60000 THEN 1600 WHEN p_amount <= 500000 THEN 2200 WHEN p_amount <= 1000000 THEN 2500 ELSE 2900 END; $function$;