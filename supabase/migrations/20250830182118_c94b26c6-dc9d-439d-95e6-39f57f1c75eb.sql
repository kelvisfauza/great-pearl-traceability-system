-- Fix Kibaba's salary to 250k and adjust ledger entries
-- Drop existing trigger first to avoid conflict

DROP TRIGGER IF EXISTS withdrawal_approval_trigger ON withdrawal_requests;
DROP FUNCTION IF EXISTS process_withdrawal_approval();

-- First, update Kibaba's salary
UPDATE employees 
SET salary = 250000, updated_at = now() 
WHERE name = 'Kibaba Nicholus';

-- Clear Kibaba's existing ledger entries (if any)
DELETE FROM ledger_entries WHERE user_id = 'kibaba_nicholus_temp_id';

-- Add correct ledger entries for Kibaba (250k salary = ~8,333 daily)
DO $$
DECLARE
    i INTEGER;
    daily_amount NUMERIC := 8333.33;
    target_date DATE;
BEGIN
    FOR i IN 0..29 LOOP
        target_date := CURRENT_DATE - INTERVAL '30 days' + INTERVAL '1 day' * i;
        
        INSERT INTO public.ledger_entries (
            user_id, 
            entry_type, 
            amount, 
            reference, 
            metadata, 
            created_at
        ) VALUES (
            'kibaba_nicholus_temp_id',
            'DAILY_SALARY',
            daily_amount,
            'KIBABA-' || gen_random_uuid()::text,
            json_build_object(
                'employee_name', 'Kibaba Nicholus',
                'monthly_salary', 250000,
                'credit_date', target_date
            ),
            target_date + TIME '08:00:00'
        );
    END LOOP;
END $$;

-- Add withdrawal processing trigger that reduces balance when approved
CREATE OR REPLACE FUNCTION process_withdrawal_approval()
RETURNS TRIGGER AS $$
BEGIN
    -- When withdrawal status changes to 'approved'
    IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
        -- Deduct the amount from user's ledger
        INSERT INTO ledger_entries (
            user_id,
            entry_type,
            amount,
            reference,
            metadata,
            created_at
        ) VALUES (
            NEW.user_id,
            'WITHDRAWAL',
            -NEW.amount, -- negative amount to reduce balance
            'WITHDRAWAL-' || NEW.id,
            json_build_object(
                'withdrawal_id', NEW.id,
                'phone_number', NEW.phone_number,
                'approved_by', NEW.approved_by
            ),
            now()
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER withdrawal_approval_trigger
    AFTER UPDATE ON withdrawal_requests
    FOR EACH ROW
    EXECUTE FUNCTION process_withdrawal_approval();