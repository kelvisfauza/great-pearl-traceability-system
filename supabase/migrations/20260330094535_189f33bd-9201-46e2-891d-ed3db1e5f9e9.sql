-- Add discretionary buying columns to quality_assessments
ALTER TABLE quality_assessments 
  ADD COLUMN IF NOT EXISTS admin_discretion_buy boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS admin_discretion_price numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS admin_discretion_by text,
  ADD COLUMN IF NOT EXISTS admin_discretion_at timestamptz,
  ADD COLUMN IF NOT EXISTS admin_discretion_notes text;

-- Add discretion_bought flag to coffee_records so we know it was bought despite rejection
ALTER TABLE coffee_records
  ADD COLUMN IF NOT EXISTS discretion_bought boolean DEFAULT false;