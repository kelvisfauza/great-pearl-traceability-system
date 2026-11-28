DO $$
DECLARE result jsonb;
BEGIN
 PERFORM set_config('request.jwt.claim.role','service_role',true);
 PERFORM set_config('request.jwt.claims','{"role":"service_role"}',true);
 result := public.return_meal_for_correction('8d1a9b77-280a-4f65-8cf0-f4c75d6bc8f1'::uuid,0,'Please reconcile the itemised costs and charges with the requested UGX 28,000. Automatic checks counted UGX 25,000 in meal items; salt has no recent purchase history; ovacadoes at UGX 2,000 exceed the usual UGX 1,000. Correct or explain these items and resubmit for automatic rechecking under the retained Admin approval. Finance may approve the unchanged plan first.');
 IF NOT coalesce((result->>'ok')::boolean,false) THEN RAISE EXCEPTION 'Meal plan return refused: %',result->>'error'; END IF;
 PERFORM net.http_post(url:='https://pudfybkyfedeggmokhco.supabase.co/functions/v1/procurement-review-notify',headers:=private_edge.header()||jsonb_build_object('Content-Type','application/json'),body:=jsonb_build_object('mode','returned','source_table','provider_submission_requests','record_id','8d1a9b77-280a-4f65-8cf0-f4c75d6bc8f1'),timeout_milliseconds:=120000);
END $$;