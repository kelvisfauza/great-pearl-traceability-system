
CREATE OR REPLACE FUNCTION public.create_booking_from_contract()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.coffee_bookings (
    supplier_id,
    supplier_name,
    coffee_type,
    booked_quantity_kg,
    booked_price_per_kg,
    booking_date,
    expiry_date,
    notes,
    created_by,
    status
  ) VALUES (
    NEW.supplier_id,
    NEW.supplier_name,
    NEW.contract_type,
    NEW.kilograms_expected,
    NEW.price_per_kg,
    NEW.date,
    (NEW.date::date + interval '90 days')::date::text,
    'Auto-created from supplier contract',
    COALESCE(NEW.approved_by, 'system'),
    'active'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_create_booking_from_contract
  AFTER INSERT ON public.supplier_contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.create_booking_from_contract();
