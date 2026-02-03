-- Sync quality_assessments batch_number to match their linked coffee_records
UPDATE quality_assessments qa
SET batch_number = cr.batch_number
FROM coffee_records cr
WHERE cr.id = qa.store_record_id
  AND qa.batch_number != cr.batch_number;