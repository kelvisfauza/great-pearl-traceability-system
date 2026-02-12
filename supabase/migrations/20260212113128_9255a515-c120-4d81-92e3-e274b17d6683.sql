-- Delete older duplicates, keeping the most recent one per store_record_id + batch_number + status
DELETE FROM quality_assessments
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY store_record_id, batch_number, status ORDER BY created_at DESC) as rn
    FROM quality_assessments
    WHERE status = 'pending_admin_pricing'
  ) sub
  WHERE rn > 1
);