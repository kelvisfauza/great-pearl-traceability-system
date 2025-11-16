-- Fix existing rejected quality assessments to have 0 price
UPDATE quality_assessments 
SET 
  suggested_price = 0,
  final_price = 0,
  updated_at = NOW()
WHERE reject_final = true AND (suggested_price != 0 OR final_price != 0);