CREATE OR REPLACE FUNCTION public.verify_maintenance_recovery_key(_key text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public AS $$
DECLARE v_hash text;
BEGIN
 SELECT recovery_key INTO v_hash FROM public.system_maintenance WHERE recovery_key IS NOT NULL ORDER BY updated_at DESC LIMIT 1;
 IF v_hash IS NULL THEN RETURN false; END IF;
 RETURN extensions.crypt(_key,v_hash)=v_hash;
END $$;
CREATE OR REPLACE FUNCTION public.verify_maintenance_recovery_pin(_pin text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public AS $$
DECLARE v_hash text;
BEGIN
 SELECT recovery_pin INTO v_hash FROM public.system_maintenance WHERE recovery_pin IS NOT NULL ORDER BY updated_at DESC LIMIT 1;
 IF v_hash IS NULL THEN RETURN false; END IF;
 RETURN extensions.crypt(_pin,v_hash)=v_hash;
END $$;