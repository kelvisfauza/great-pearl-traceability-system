-- Store: Stock Verifications
CREATE TABLE IF NOT EXISTS store_stock_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_date date NOT NULL DEFAULT CURRENT_DATE,
  verified_by text NOT NULL,
  system_total_bags integer NOT NULL DEFAULT 0,
  physical_total_bags integer NOT NULL DEFAULT 0,
  system_total_kg numeric NOT NULL DEFAULT 0,
  physical_total_kg numeric NOT NULL DEFAULT 0,
  discrepancy_bags integer GENERATED ALWAYS AS (physical_total_bags - system_total_bags) STORED,
  discrepancy_kg numeric GENERATED ALWAYS AS (physical_total_kg - system_total_kg) STORED,
  notes text,
  status text NOT NULL DEFAULT 'completed',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE store_stock_verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage store verifications" ON store_stock_verifications FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Store: Damaged Bags (coffee_records.id is text)
CREATE TABLE IF NOT EXISTS store_damaged_bags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_number text NOT NULL,
  coffee_record_id text,
  damage_type text NOT NULL,
  bags_affected integer NOT NULL DEFAULT 1,
  estimated_loss_kg numeric NOT NULL DEFAULT 0,
  reported_by text NOT NULL,
  reported_date date NOT NULL DEFAULT CURRENT_DATE,
  action_taken text,
  status text NOT NULL DEFAULT 'reported',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE store_damaged_bags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage damaged bags" ON store_damaged_bags FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Milling: Jobs/Transactions
CREATE TABLE IF NOT EXISTS milling_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_number text NOT NULL,
  customer_name text NOT NULL,
  customer_phone text,
  coffee_type text NOT NULL DEFAULT 'Robusta',
  input_weight_kg numeric NOT NULL,
  output_weight_kg numeric,
  loss_kg numeric GENERATED ALWAYS AS (input_weight_kg - COALESCE(output_weight_kg, input_weight_kg)) STORED,
  price_per_kg numeric NOT NULL DEFAULT 0,
  total_cost numeric NOT NULL DEFAULT 0,
  amount_paid numeric NOT NULL DEFAULT 0,
  balance numeric GENERATED ALWAYS AS (total_cost - amount_paid) STORED,
  status text NOT NULL DEFAULT 'pending',
  milled_by text,
  started_at timestamptz,
  completed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE milling_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage milling jobs" ON milling_jobs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Milling: Customer Accounts
CREATE TABLE IF NOT EXISTS milling_customer_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  customer_phone text,
  total_jobs integer NOT NULL DEFAULT 0,
  total_milled_kg numeric NOT NULL DEFAULT 0,
  total_charged numeric NOT NULL DEFAULT 0,
  total_paid numeric NOT NULL DEFAULT 0,
  outstanding_balance numeric NOT NULL DEFAULT 0,
  last_visit date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE milling_customer_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage milling accounts" ON milling_customer_accounts FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Logistics: Vehicle Trips
CREATE TABLE IF NOT EXISTS vehicle_trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_name text NOT NULL,
  driver_name text NOT NULL,
  route text NOT NULL,
  origin text NOT NULL,
  destination text NOT NULL,
  departure_time timestamptz,
  arrival_time timestamptz,
  cargo_description text,
  cargo_weight_kg numeric,
  fuel_cost numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'scheduled',
  delay_reason text,
  delay_minutes integer DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE vehicle_trips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage vehicle trips" ON vehicle_trips FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Logistics: Shipments
CREATE TABLE IF NOT EXISTS logistics_shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_ref text NOT NULL,
  buyer_name text NOT NULL,
  contract_ref text,
  total_bags integer NOT NULL DEFAULT 0,
  total_kg numeric NOT NULL DEFAULT 0,
  origin text NOT NULL,
  destination text NOT NULL,
  transporter text,
  vehicle text,
  dispatch_date date,
  expected_arrival date,
  actual_arrival date,
  status text NOT NULL DEFAULT 'preparing',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE logistics_shipments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage shipments" ON logistics_shipments FOR ALL TO authenticated USING (true) WITH CHECK (true);