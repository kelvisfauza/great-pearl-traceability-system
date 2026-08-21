ALTER TABLE public.buyer_contracts
  ADD COLUMN IF NOT EXISTS document_path TEXT,
  ADD COLUMN IF NOT EXISTS document_name TEXT;

-- Ensure authenticated staff can manage objects in the private contracts bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects' AND policyname='Authenticated can read contract docs'
  ) THEN
    CREATE POLICY "Authenticated can read contract docs"
      ON storage.objects FOR SELECT TO authenticated
      USING (bucket_id = 'contracts');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects' AND policyname='Authenticated can upload contract docs'
  ) THEN
    CREATE POLICY "Authenticated can upload contract docs"
      ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'contracts');
  END IF;
END $$;