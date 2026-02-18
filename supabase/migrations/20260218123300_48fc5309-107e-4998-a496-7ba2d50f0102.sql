
-- First delete finance_coffee_lots that reference duplicate assessments
DELETE FROM finance_coffee_lots
WHERE quality_assessment_id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (PARTITION BY store_record_id ORDER BY 
        CASE status 
          WHEN 'approved' THEN 1 
          WHEN 'submitted_to_finance' THEN 2 
          WHEN 'pending_admin_pricing' THEN 3 
          ELSE 4 
        END, 
        created_at ASC
      ) as rn
    FROM quality_assessments
    WHERE store_record_id IN (
      SELECT store_record_id FROM quality_assessments GROUP BY store_record_id HAVING COUNT(*) > 1
    )
  ) ranked
  WHERE rn > 1
);

-- Now delete duplicate quality assessments
DELETE FROM quality_assessments
WHERE id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (PARTITION BY store_record_id ORDER BY 
        CASE status 
          WHEN 'approved' THEN 1 
          WHEN 'submitted_to_finance' THEN 2 
          WHEN 'pending_admin_pricing' THEN 3 
          ELSE 4 
        END, 
        created_at ASC
      ) as rn
    FROM quality_assessments
    WHERE store_record_id IN (
      SELECT store_record_id FROM quality_assessments GROUP BY store_record_id HAVING COUNT(*) > 1
    )
  ) ranked
  WHERE rn > 1
);
