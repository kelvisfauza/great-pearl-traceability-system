-- Repair inconsistency: any coffee_records that have a quality_assessment with reject_final=true
-- should have status QUALITY_REJECTED (not 'assessed') so UI badges match the rejection state.
UPDATE public.coffee_records cr
SET status = 'QUALITY_REJECTED'
FROM public.quality_assessments qa
WHERE qa.store_record_id = cr.id
  AND qa.reject_final = true
  AND COALESCE(qa.permanently_rejected, false) = false
  AND cr.status NOT IN ('QUALITY_REJECTED', 'PERMANENTLY_REJECTED', 'sold_out');