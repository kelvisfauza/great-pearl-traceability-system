UPDATE meal_disbursements 
SET yo_status = 'pending_approval', updated_at = now()
WHERE yo_status = 'failed' 
  AND yo_raw_response LIKE '%StatusCode>-22%';