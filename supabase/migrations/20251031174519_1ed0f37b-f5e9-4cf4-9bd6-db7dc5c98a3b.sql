-- Update the foreign key constraint to cascade deletions
ALTER TABLE finance_coffee_lots 
  DROP CONSTRAINT IF EXISTS finance_coffee_lots_coffee_record_id_fkey;

ALTER TABLE finance_coffee_lots
  ADD CONSTRAINT finance_coffee_lots_coffee_record_id_fkey 
  FOREIGN KEY (coffee_record_id) 
  REFERENCES coffee_records(id) 
  ON DELETE CASCADE;