-- Fix coffee_records that have approved/submitted assessments but were left as 'pending'
UPDATE public.coffee_records cr
SET status = 'assessed', updated_at = now()
FROM public.quality_assessments qa
WHERE qa.store_record_id = cr.id
  AND cr.status IN ('pending','quality_review')
  AND qa.status IN ('approved','submitted_to_finance','assessed','pending_admin_pricing');