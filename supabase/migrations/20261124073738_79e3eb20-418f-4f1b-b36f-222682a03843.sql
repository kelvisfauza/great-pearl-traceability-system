DO $$ DECLARE definition text; BEGIN
 definition:=pg_get_functiondef('vendor_accounts_private.action(text,uuid,uuid,jsonb,integer)'::regprocedure);
 definition:=replace(definition,'r public.provider_submission_requests;','request_row public.provider_submission_requests;');
 definition:=replace(definition,'SELECT * INTO r FROM public.provider_submission_requests','SELECT * INTO request_row FROM public.provider_submission_requests');
 definition:=replace(definition,$old$IF NOT FOUND OR r.status<>'pending'$old$,$new$IF NOT FOUND OR request_row.status<>'pending'$new$);
 definition:=replace(definition,$old$'previous_vendor_id',r.service_provider_id$old$,$new$'previous_vendor_id',request_row.service_provider_id$new$);
 EXECUTE definition;
END $$;