-- Enable real-time for deletion_requests table
ALTER TABLE public.deletion_requests REPLICA IDENTITY FULL;

-- Add deletion_requests to the realtime publication if not already added
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'deletion_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.deletion_requests;
  END IF;
END $$;