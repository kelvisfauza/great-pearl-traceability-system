-- Drop the duplicate trigger (keeping execute_approved_deletion_trigger)
DROP TRIGGER IF EXISTS on_deletion_request_approved ON deletion_requests;