-- Add total_bulked_coffee field to eudr_documents table
ALTER TABLE eudr_documents 
ADD COLUMN total_bulked_coffee NUMERIC DEFAULT 0;