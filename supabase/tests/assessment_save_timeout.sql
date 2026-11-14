-- Administrator-only regression. All test writes roll back, including Finance and inventory.
DO $test$
DECLARE saved jsonb;
BEGIN
 BEGIN
  PERFORM set_config('request.jwt.claim.sub','00b188fc-73fe-4ee7-9fe9-956ab2faa6ec',true);
  PERFORM set_config('request.jwt.claims','{"sub":"00b188fc-73fe-4ee7-9fe9-956ab2faa6ec","role":"authenticated"}',true);
  saved:=public.insert_quality_assessment('{"store_record_id":"38187cc4-64b4-4087-92ec-db4dd2f9f6f1","batch_number":"20261029021","moisture":15,"group1_defects":0,"group2_defects":0,"below12":0,"pods":0,"husks":0,"stones":0,"fm":0,"clean_d14":0,"outturn":100,"outturn_price":0,"final_price":11000,"suggested_price":11000,"reject_outturn_price":false,"reject_final":false,"status":"approved","date_assessed":"2026-11-14","assessed_by":"Fauza Kusa 2"}'::jsonb);
  IF saved->>'id' IS NULL OR (saved->>'final_price')::numeric<>11000 THEN
   RAISE EXCEPTION 'Assessment did not save expected 11000 price';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.finance_coffee_lots WHERE quality_assessment_id=(saved->>'id')::uuid AND quantity_kg=291 AND unit_price_ugx=11000) THEN
   RAISE EXCEPTION 'Assessment did not create expected 291 kg Finance lot';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM system_integrity_private.scan_requests WHERE request_id=txid_current()) THEN
   RAISE EXCEPTION 'Integrity check was not queued for this save';
  END IF;
  RAISE EXCEPTION USING ERRCODE='ZX001',MESSAGE='rollback successful test';
 EXCEPTION WHEN SQLSTATE 'ZX001' THEN NULL;
 END;
END;
$test$;