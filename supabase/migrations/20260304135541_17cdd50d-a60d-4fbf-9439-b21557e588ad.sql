
-- Step 1: Reactivate Eric's expired booking and extend expiry
UPDATE public.coffee_bookings
SET status = 'active',
    expiry_date = '2026-03-10',
    updated_at = now()
WHERE id = '16787c7a-b774-491b-b1b4-6073096e1891';

-- Step 2: Record the 14,132 kg delivery against this booking
-- The update_booking_on_delivery trigger will automatically update delivered_quantity_kg and status
INSERT INTO public.coffee_booking_deliveries (
  booking_id,
  coffee_record_id,
  delivered_kg,
  delivery_date,
  notes,
  created_by
) VALUES (
  '16787c7a-b774-491b-b1b4-6073096e1891',
  'CR-1772477127969',
  14132,
  '2026-03-02',
  'Linked delivery from batch 20260302008 - 14,132kg Arabica',
  'System Admin'
);
