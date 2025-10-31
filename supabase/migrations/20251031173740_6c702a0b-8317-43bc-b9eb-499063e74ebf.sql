-- Enable real-time for coffee_records table to track deletions
ALTER TABLE public.coffee_records REPLICA IDENTITY FULL;

-- Add coffee_records to the realtime publication if not already added
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'coffee_records'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.coffee_records;
  END IF;
END $$;