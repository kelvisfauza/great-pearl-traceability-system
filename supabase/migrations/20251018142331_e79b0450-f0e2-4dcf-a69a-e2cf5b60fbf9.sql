-- Create vehicles table for fleet management
CREATE TABLE IF NOT EXISTS public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  vehicle_type TEXT NOT NULL, -- Truck, Van, etc.
  driver_name TEXT NOT NULL,
  driver_phone TEXT,
  route TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Available', -- Available, En Route, Loading, Maintenance, Delivered
  current_load TEXT,
  load_capacity_bags INTEGER,
  eta TEXT,
  last_location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create shipments table for international shipments
CREATE TABLE IF NOT EXISTS public.shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destination TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  bags INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'Processing', -- Processing, In Transit, Customs, Delivered
  vessel_name TEXT,
  eta DATE,
  departure_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create routes table for delivery routes
CREATE TABLE IF NOT EXISTS public.delivery_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  locations TEXT[] NOT NULL,
  distance_km NUMERIC NOT NULL,
  frequency TEXT NOT NULL, -- Daily, Weekly, Bi-weekly, Monthly
  active_vehicles INTEGER DEFAULT 0,
  estimated_hours NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create warehouses table
CREATE TABLE IF NOT EXISTS public.warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location TEXT NOT NULL,
  capacity_bags INTEGER NOT NULL,
  current_bags INTEGER DEFAULT 0,
  utilization_percentage NUMERIC GENERATED ALWAYS AS (
    CASE 
      WHEN capacity_bags > 0 THEN ROUND((current_bags::numeric / capacity_bags::numeric) * 100, 1)
      ELSE 0
    END
  ) STORED,
  status TEXT NOT NULL DEFAULT 'Operational', -- Operational, Maintenance, Closed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vehicles
CREATE POLICY "Anyone can view vehicles"
  ON public.vehicles FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert vehicles"
  ON public.vehicles FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update vehicles"
  ON public.vehicles FOR UPDATE
  USING (true);

CREATE POLICY "Only admins can delete vehicles"
  ON public.vehicles FOR DELETE
  USING (is_current_user_admin());

-- RLS Policies for shipments
CREATE POLICY "Anyone can view shipments"
  ON public.shipments FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert shipments"
  ON public.shipments FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update shipments"
  ON public.shipments FOR UPDATE
  USING (true);

CREATE POLICY "Only admins can delete shipments"
  ON public.shipments FOR DELETE
  USING (is_current_user_admin());

-- RLS Policies for delivery_routes
CREATE POLICY "Anyone can view routes"
  ON public.delivery_routes FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert routes"
  ON public.delivery_routes FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update routes"
  ON public.delivery_routes FOR UPDATE
  USING (true);

CREATE POLICY "Only admins can delete routes"
  ON public.delivery_routes FOR DELETE
  USING (is_current_user_admin());

-- RLS Policies for warehouses
CREATE POLICY "Anyone can view warehouses"
  ON public.warehouses FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert warehouses"
  ON public.warehouses FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update warehouses"
  ON public.warehouses FOR UPDATE
  USING (true);

CREATE POLICY "Only admins can delete warehouses"
  ON public.warehouses FOR DELETE
  USING (is_current_user_admin());

-- Add update triggers
CREATE TRIGGER update_vehicles_updated_at
  BEFORE UPDATE ON public.vehicles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shipments_updated_at
  BEFORE UPDATE ON public.shipments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_routes_updated_at
  BEFORE UPDATE ON public.delivery_routes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_warehouses_updated_at
  BEFORE UPDATE ON public.warehouses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();