-- Create account balances for employees one by one with UUID references

-- For Kibaba Nicholus (300,000 salary = 300k total)
DO $$
DECLARE
    i INTEGER;
    daily_amount NUMERIC := 10000.00;
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
                'monthly_salary', 300000,
                'credit_date', target_date
            ),
            target_date + TIME '08:00:00'
        );
    END LOOP;
END $$;

-- For Admin User (300,000 salary = 300k total)
DO $$
DECLARE
    i INTEGER;
    daily_amount NUMERIC := 10000.00;
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
            '5fe8c99d-ee15-484d-8765-9bd4b37f961f',
            'DAILY_SALARY',
            daily_amount,
            'ADMIN-' || gen_random_uuid()::text,
            json_build_object(
                'employee_name', 'Admin User',
                'monthly_salary', 300000,
                'credit_date', target_date
            ),
            target_date + TIME '08:00:00'
        );
    END LOOP;
END $$;

-- For Artwanzire Timothy (300,000 salary = 300k total)
DO $$
DECLARE
    i INTEGER;
    daily_amount NUMERIC := 10000.00;
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
            'e5c7b8bc-1f27-4c0f-a750-c6f4e8b4a641',
            'DAILY_SALARY',
            daily_amount,
            'ARTWAN-' || gen_random_uuid()::text,
            json_build_object(
                'employee_name', 'Artwanzire Timothy',
                'monthly_salary', 300000,
                'credit_date', target_date
            ),
            target_date + TIME '08:00:00'
        );
    END LOOP;
END $$;