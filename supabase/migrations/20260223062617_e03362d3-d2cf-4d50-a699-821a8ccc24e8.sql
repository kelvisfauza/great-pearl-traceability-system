
-- Update the booking delivery trigger to consider bookings fulfilled/closed 
-- when delivery is within 5% tolerance (slightly lower or higher)
CREATE OR REPLACE FUNCTION public.update_booking_on_delivery()
RETURNS TRIGGER AS $$
DECLARE
  booking_record RECORD;
  new_delivered NUMERIC;
BEGIN
  -- Get the current booking
  SELECT * INTO booking_record FROM public.coffee_bookings WHERE id = NEW.booking_id;
  
  -- Calculate new delivered total
  new_delivered := booking_record.delivered_quantity_kg + NEW.delivered_kg;
  
  UPDATE public.coffee_bookings
  SET 
    delivered_quantity_kg = new_delivered,
    status = CASE 
      -- If delivered >= 95% of booked quantity, consider it fulfilled
      WHEN new_delivered >= (booked_quantity_kg * 0.95) THEN 'fulfilled'
      WHEN new_delivered > 0 THEN 'partially_fulfilled'
      ELSE status
    END,
    updated_at = now()
  WHERE id = NEW.booking_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
