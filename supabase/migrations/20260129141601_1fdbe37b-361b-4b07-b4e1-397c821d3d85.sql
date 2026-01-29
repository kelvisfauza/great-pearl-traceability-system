-- Create coffee_bookings table for price hedging
CREATE TABLE public.coffee_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID REFERENCES public.suppliers(id),
  supplier_name TEXT NOT NULL,
  coffee_type TEXT NOT NULL CHECK (coffee_type IN ('Arabica', 'Robusta')),
  booked_quantity_kg NUMERIC NOT NULL,
  delivered_quantity_kg NUMERIC NOT NULL DEFAULT 0,
  remaining_quantity_kg NUMERIC GENERATED ALWAYS AS (booked_quantity_kg - delivered_quantity_kg) STORED,
  booked_price_per_kg NUMERIC NOT NULL,
  booking_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery_date DATE,
  expiry_date DATE NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'partially_fulfilled', 'fulfilled', 'expired', 'cancelled')),
  created_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.coffee_bookings ENABLE ROW LEVEL SECURITY;

-- Create policies for coffee_bookings
CREATE POLICY "Allow read access to coffee_bookings"
ON public.coffee_bookings
FOR SELECT
USING (true);

CREATE POLICY "Allow insert to coffee_bookings"
ON public.coffee_bookings
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow update to coffee_bookings"
ON public.coffee_bookings
FOR UPDATE
USING (true);

-- Create coffee_booking_deliveries table to track partial deliveries
CREATE TABLE public.coffee_booking_deliveries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.coffee_bookings(id) ON DELETE CASCADE,
  coffee_record_id TEXT,
  delivered_kg NUMERIC NOT NULL,
  delivery_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.coffee_booking_deliveries ENABLE ROW LEVEL SECURITY;

-- Create policies for coffee_booking_deliveries
CREATE POLICY "Allow read access to coffee_booking_deliveries"
ON public.coffee_booking_deliveries
FOR SELECT
USING (true);

CREATE POLICY "Allow insert to coffee_booking_deliveries"
ON public.coffee_booking_deliveries
FOR INSERT
WITH CHECK (true);

-- Create function to update booking status and delivered quantity
CREATE OR REPLACE FUNCTION public.update_booking_on_delivery()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.coffee_bookings
  SET 
    delivered_quantity_kg = delivered_quantity_kg + NEW.delivered_kg,
    status = CASE 
      WHEN delivered_quantity_kg + NEW.delivered_kg >= booked_quantity_kg THEN 'fulfilled'
      WHEN delivered_quantity_kg + NEW.delivered_kg > 0 THEN 'partially_fulfilled'
      ELSE status
    END,
    updated_at = now()
  WHERE id = NEW.booking_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for delivery updates
CREATE TRIGGER on_booking_delivery_insert
AFTER INSERT ON public.coffee_booking_deliveries
FOR EACH ROW
EXECUTE FUNCTION public.update_booking_on_delivery();

-- Create function to expire old bookings
CREATE OR REPLACE FUNCTION public.expire_old_bookings()
RETURNS void AS $$
BEGIN
  UPDATE public.coffee_bookings
  SET status = 'expired', updated_at = now()
  WHERE status = 'active' 
    AND expiry_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add indexes
CREATE INDEX idx_coffee_bookings_supplier_id ON public.coffee_bookings(supplier_id);
CREATE INDEX idx_coffee_bookings_status ON public.coffee_bookings(status);
CREATE INDEX idx_coffee_bookings_expiry ON public.coffee_bookings(expiry_date);

-- Add trigger for updated_at
CREATE TRIGGER update_coffee_bookings_updated_at
BEFORE UPDATE ON public.coffee_bookings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();