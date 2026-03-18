-- Create storage bucket for contract PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('contract-documents', 'contract-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload contract docs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'contract-documents');

-- Allow authenticated users to read
CREATE POLICY "Authenticated users can read contract docs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'contract-documents');

-- Allow authenticated users to delete contract docs
CREATE POLICY "Authenticated users can delete contract docs"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'contract-documents');

-- Add buyer_contract_id column to contract_files for proper linking
ALTER TABLE contract_files ADD COLUMN IF NOT EXISTS buyer_contract_id uuid REFERENCES buyer_contracts(id) ON DELETE SET NULL;

-- Add contract_type column to distinguish buyer vs supplier contract files
ALTER TABLE contract_files ADD COLUMN IF NOT EXISTS contract_type text DEFAULT 'buyer';