ALTER TABLE quality_assessments 
  ADD COLUMN grn_printed boolean DEFAULT false,
  ADD COLUMN grn_printed_by text,
  ADD COLUMN grn_printed_at timestamptz;