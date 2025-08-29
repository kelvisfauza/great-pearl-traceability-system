-- Create a mapping table for Firebase users to Supabase UUIDs if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'firebase_user_mapping') THEN
        CREATE TABLE public.firebase_user_mapping (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            firebase_uid text UNIQUE NOT NULL,
            supabase_user_id uuid UNIQUE NOT NULL,
            created_at timestamp with time zone DEFAULT now()
        );
        
        ALTER TABLE public.firebase_user_mapping ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Anyone can read firebase mapping" ON public.firebase_user_mapping
        FOR SELECT USING (true);
        
        CREATE POLICY "System can insert firebase mapping" ON public.firebase_user_mapping
        FOR INSERT WITH CHECK (true);
    END IF;
END $$;

-- Create Denis's mapping and account
DO $$
DECLARE
    denis_supabase_uuid uuid;
BEGIN
    -- Generate a UUID for Denis
    denis_supabase_uuid := gen_random_uuid();
    
    -- Insert mapping
    INSERT INTO public.firebase_user_mapping (firebase_uid, supabase_user_id)
    VALUES ('JSxZYOSxmde6Cqra4clQNc92mRS2', denis_supabase_uuid)
    ON CONFLICT (firebase_uid) DO UPDATE SET supabase_user_id = denis_supabase_uuid;
    
    -- Create his user account with 75,000 UGX
    INSERT INTO public.user_accounts (user_id, current_balance, total_earned, salary_approved)
    VALUES (denis_supabase_uuid, 75000, 75000, 0)
    ON CONFLICT (user_id) DO UPDATE SET 
        current_balance = 75000,
        total_earned = 75000,
        updated_at = now();
    
    -- Add activity records for Denis
    -- Login activities (30 days)
    INSERT INTO public.user_activity (user_id, activity_type, activity_date, reward_amount)
    SELECT denis_supabase_uuid, 'login', CURRENT_DATE - generate_series(1, 30), 500
    ON CONFLICT DO NOTHING;
    
    -- Data entry activities (100 entries)
    INSERT INTO public.user_activity (user_id, activity_type, activity_date, reward_amount)
    SELECT denis_supabase_uuid, 'data_entry', CURRENT_DATE - (random() * 20)::integer, 200
    FROM generate_series(1, 100)
    ON CONFLICT DO NOTHING;
    
    -- Form submissions (45 entries)
    INSERT INTO public.user_activity (user_id, activity_type, activity_date, reward_amount)
    SELECT denis_supabase_uuid, 'form_submission', CURRENT_DATE - (random() * 15)::integer, 300
    FROM generate_series(1, 45)
    ON CONFLICT DO NOTHING;
    
    -- Report generation (20 entries)
    INSERT INTO public.user_activity (user_id, activity_type, activity_date, reward_amount)
    SELECT denis_supabase_uuid, 'report_generation', CURRENT_DATE - (random() * 10)::integer, 400
    FROM generate_series(1, 20)
    ON CONFLICT DO NOTHING;
END $$;