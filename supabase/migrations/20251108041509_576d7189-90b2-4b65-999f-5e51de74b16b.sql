-- Add status column to contract_files table
ALTER TABLE contract_files 
ADD COLUMN status TEXT NOT NULL DEFAULT 'Draft';

-- Add a check constraint to ensure valid status values
ALTER TABLE contract_files
ADD CONSTRAINT contract_files_status_check 
CHECK (status IN ('Draft', 'Sent', 'Signed', 'Expired'));

-- Create an index on status for faster filtering
CREATE INDEX idx_contract_files_status ON contract_files(status);