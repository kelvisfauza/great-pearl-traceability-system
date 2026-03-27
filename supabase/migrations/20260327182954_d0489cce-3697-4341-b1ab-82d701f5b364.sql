-- Add profile completion fields to employees table
ALTER TABLE public.employees 
  ADD COLUMN IF NOT EXISTS national_id_name text,
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS next_of_kin_name text,
  ADD COLUMN IF NOT EXISTS next_of_kin_phone text,
  ADD COLUMN IF NOT EXISTS next_of_kin_relationship text,
  ADD COLUMN IF NOT EXISTS tribe text,
  ADD COLUMN IF NOT EXISTS district text,
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS marital_status text,
  ADD COLUMN IF NOT EXISTS national_id_number text,
  ADD COLUMN IF NOT EXISTS profile_completed boolean DEFAULT false;

-- Create birthday rewards tracking table
CREATE TABLE IF NOT EXISTS public.birthday_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id text NOT NULL,
  employee_email text NOT NULL,
  employee_name text NOT NULL,
  birthday_year integer NOT NULL,
  amount numeric DEFAULT 50000,
  ledger_reference text,
  sms_sent boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(employee_email, birthday_year)
);

ALTER TABLE public.birthday_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read birthday rewards" ON public.birthday_rewards
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "System can insert birthday rewards" ON public.birthday_rewards
  FOR INSERT TO authenticated WITH CHECK (true);

-- Storage bucket for profile pictures (ignore if exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile_pictures', 'profile_pictures', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies (use IF NOT EXISTS pattern via DO block)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can upload profile pictures' AND tablename = 'objects') THEN
    CREATE POLICY "Users can upload profile pictures" ON storage.objects
      FOR INSERT TO authenticated WITH CHECK (bucket_id = 'profile_pictures');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view profile pictures' AND tablename = 'objects') THEN
    CREATE POLICY "Anyone can view profile pictures" ON storage.objects
      FOR SELECT TO public USING (bucket_id = 'profile_pictures');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own profile pictures' AND tablename = 'objects') THEN
    CREATE POLICY "Users can update own profile pictures" ON storage.objects
      FOR UPDATE TO authenticated USING (bucket_id = 'profile_pictures');
  END IF;
END $$;