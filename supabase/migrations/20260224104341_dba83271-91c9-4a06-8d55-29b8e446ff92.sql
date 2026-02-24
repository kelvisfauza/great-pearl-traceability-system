-- Make sensitive storage buckets private
UPDATE storage.buckets SET public = false WHERE id IN (
  'job-applications',
  'chat-attachments', 
  'contracts',
  'market-screenshots',
  'dispatch-attachments'
);

-- Note: profile_pictures stays public (acceptable for UX)