-- Add sold_out to allowed statuses
ALTER TABLE coffee_records DROP CONSTRAINT coffee_records_status_check;
ALTER TABLE coffee_records ADD CONSTRAINT coffee_records_status_check 
  CHECK (status = ANY (ARRAY['pending', 'quality_review', 'pricing', 'batched', 'drying', 'sales', 'inventory', 'submitted_to_finance', 'assessed', 'rejected', 'AWAITING_PRICING', 'QUALITY_REJECTED', 'sold_out']));

-- Step 1: Mark ALL old inventory records as sold_out
UPDATE coffee_records 
SET status = 'sold_out', updated_at = now() 
WHERE status = 'inventory';

-- Step 2: Create baseline reconciliation record (5,488 kg from Saturday)
INSERT INTO coffee_records (id, batch_number, coffee_type, kilograms, bags, supplier_name, date, status, created_by)
VALUES 
  ('RECON-20260307-001', 'RECON-SAT-001', 'Arabica', 5488, 0, 'Reconciliation Baseline', '2026-03-07', 'inventory', 'system-reconciliation');

-- Step 3: Move March 7+ pending purchases to inventory
UPDATE coffee_records 
SET status = 'inventory', updated_at = now()
WHERE date >= '2026-03-07' 
  AND status = 'pending';