-- Create supplier_contract_deliveries table (coffee_records.id is text)
CREATE TABLE IF NOT EXISTS supplier_contract_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES supplier_contracts(id) ON DELETE CASCADE,
  coffee_record_id text,
  delivered_kg numeric NOT NULL,
  delivery_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_by text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE supplier_contract_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to supplier_contract_deliveries" ON supplier_contract_deliveries
  FOR ALL USING (true) WITH CHECK (true);

-- Create function to auto-update delivered_quantity on supplier_contracts
CREATE OR REPLACE FUNCTION update_supplier_contract_delivered_quantity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE supplier_contracts 
  SET delivered_quantity = (
    SELECT COALESCE(SUM(delivered_kg), 0) 
    FROM supplier_contract_deliveries 
    WHERE contract_id = COALESCE(NEW.contract_id, OLD.contract_id)
  )
  WHERE id = COALESCE(NEW.contract_id, OLD.contract_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_supplier_contract_delivered
AFTER INSERT OR UPDATE OR DELETE ON supplier_contract_deliveries
FOR EACH ROW EXECUTE FUNCTION update_supplier_contract_delivered_quantity();