-- Drop the existing status constraint and add a new one with 'closed' status
ALTER TABLE coffee_bookings DROP CONSTRAINT coffee_bookings_status_check;

ALTER TABLE coffee_bookings ADD CONSTRAINT coffee_bookings_status_check 
CHECK (status = ANY (ARRAY['active'::text, 'partially_fulfilled'::text, 'fulfilled'::text, 'expired'::text, 'cancelled'::text, 'closed'::text]));