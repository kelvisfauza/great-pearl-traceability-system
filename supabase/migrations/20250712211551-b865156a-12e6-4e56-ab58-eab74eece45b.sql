
-- Create purchase_orders table for Procurement module
CREATE TABLE public.purchase_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID REFERENCES public.suppliers(id),
  supplier_name TEXT NOT NULL,
  coffee_type TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL NOT NULL,
  total_amount DECIMAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'Draft',
  delivery_date DATE NOT NULL,
  received INTEGER DEFAULT 0,
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create field_agents table for Field Operations
CREATE TABLE public.field_agents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  region TEXT NOT NULL,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'Active',
  collections_count INTEGER DEFAULT 0,
  last_report_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create buying_stations table for Field Operations
CREATE TABLE public.buying_stations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  capacity INTEGER NOT NULL,
  current_occupancy INTEGER DEFAULT 0,
  manager_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Operational',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create field_collections table for Field Operations
CREATE TABLE public.field_collections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  farmer_name TEXT NOT NULL,
  location TEXT NOT NULL,
  bags INTEGER NOT NULL,
  quality_grade TEXT NOT NULL,
  agent_id UUID REFERENCES public.field_agents(id),
  agent_name TEXT NOT NULL,
  collection_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'Collected',
  batch_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create customers table for Sales & Marketing
CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  country TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'Active',
  total_orders INTEGER DEFAULT 0,
  total_value DECIMAL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create marketing_campaigns table for Sales & Marketing
CREATE TABLE public.marketing_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  budget DECIMAL NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'Planning',
  roi_percentage DECIMAL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sales_contracts table for Sales & Marketing
CREATE TABLE public.sales_contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES public.customers(id),
  customer_name TEXT NOT NULL,
  quantity TEXT NOT NULL,
  price DECIMAL NOT NULL,
  delivery_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'Draft',
  contract_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create inventory_items table for Inventory Management
CREATE TABLE public.inventory_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coffee_type TEXT NOT NULL,
  total_bags INTEGER NOT NULL DEFAULT 0,
  total_kilograms DECIMAL NOT NULL DEFAULT 0,
  location TEXT NOT NULL DEFAULT 'Main Warehouse',
  status TEXT NOT NULL DEFAULT 'available',
  batch_numbers TEXT[] DEFAULT '{}',
  last_updated DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create storage_locations table for Inventory Management
CREATE TABLE public.storage_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  capacity INTEGER NOT NULL,
  current_occupancy INTEGER DEFAULT 0,
  occupancy_percentage INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create market_data table for Data Analyst
CREATE TABLE public.market_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coffee_type TEXT NOT NULL,
  price_usd DECIMAL NOT NULL,
  price_ugx DECIMAL NOT NULL,
  exchange_rate DECIMAL NOT NULL,
  market_source TEXT NOT NULL,
  date_recorded DATE NOT NULL DEFAULT CURRENT_DATE,
  change_percentage DECIMAL DEFAULT 0,
  trend TEXT DEFAULT 'stable',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create price_forecasts table for Data Analyst
CREATE TABLE public.price_forecasts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coffee_type TEXT NOT NULL,
  predicted_price DECIMAL NOT NULL,
  forecast_date DATE NOT NULL,
  confidence_level DECIMAL NOT NULL,
  model_used TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS policies for all tables
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.field_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buying_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.field_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storage_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_forecasts ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (all CRUD operations)
CREATE POLICY "Anyone can manage purchase_orders" ON public.purchase_orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can manage field_agents" ON public.field_agents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can manage buying_stations" ON public.buying_stations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can manage field_collections" ON public.field_collections FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can manage customers" ON public.customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can manage marketing_campaigns" ON public.marketing_campaigns FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can manage sales_contracts" ON public.sales_contracts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can manage inventory_items" ON public.inventory_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can manage storage_locations" ON public.storage_locations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can manage market_data" ON public.market_data FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can manage price_forecasts" ON public.price_forecasts FOR ALL USING (true) WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX idx_purchase_orders_supplier ON public.purchase_orders(supplier_id);
CREATE INDEX idx_purchase_orders_status ON public.purchase_orders(status);
CREATE INDEX idx_field_collections_agent ON public.field_collections(agent_id);
CREATE INDEX idx_field_collections_date ON public.field_collections(collection_date);
CREATE INDEX idx_sales_contracts_customer ON public.sales_contracts(customer_id);
CREATE INDEX idx_inventory_items_type ON public.inventory_items(coffee_type);
CREATE INDEX idx_market_data_date ON public.market_data(date_recorded);
CREATE INDEX idx_market_data_type ON public.market_data(coffee_type);

-- Insert sample storage locations
INSERT INTO public.storage_locations (name, capacity, current_occupancy, occupancy_percentage) VALUES
('Main Warehouse', 10000, 0, 0),
('Secondary Storage', 5000, 0, 0),
('Quality Control Area', 1000, 0, 0);
