-- Add remaining employees with high-value balances

-- For Kusa Fauza (1,200,000 salary = 1.2M total)
DO $$
DECLARE
    i INTEGER;
    daily_amount NUMERIC := 40000.00;
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
            'kusa_fauza_temp_id',
            'DAILY_SALARY',
            daily_amount,
            'KUSA-' || gen_random_uuid()::text,
            json_build_object(
                'employee_name', 'Kusa Fauza',
                'monthly_salary', 1200000,
                'credit_date', target_date
            ),
            target_date + TIME '08:00:00'
        );
    END LOOP;
END $$;

-- For HR Manager (800,000 salary = 800k total)
DO $$
DECLARE
    i INTEGER;
    daily_amount NUMERIC := 26666.67;
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
            'hr_manager_temp_id',
            'DAILY_SALARY',
            daily_amount,
            'HR-' || gen_random_uuid()::text,
            json_build_object(
                'employee_name', 'HR Manager',
                'monthly_salary', 800000,
                'credit_date', target_date
            ),
            target_date + TIME '08:00:00'
        );
    END LOOP;
END $$;