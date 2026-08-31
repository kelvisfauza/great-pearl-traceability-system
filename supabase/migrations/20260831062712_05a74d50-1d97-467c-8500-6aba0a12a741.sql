
CREATE TABLE IF NOT EXISTS public.job_openings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  department text,
  location text default 'Kasese, Uganda',
  employment_type text default 'Full-time',
  summary text,
  responsibilities text,
  requirements text,
  salary_range text,
  closing_date date,
  is_open boolean not null default true,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

GRANT SELECT ON public.job_openings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_openings TO authenticated;
GRANT ALL ON public.job_openings TO service_role;

ALTER TABLE public.job_openings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view open job openings" ON public.job_openings;
CREATE POLICY "Public can view open job openings" ON public.job_openings
FOR SELECT TO anon, authenticated USING (is_open = true);

DROP POLICY IF EXISTS "HR or admin manage job openings" ON public.job_openings;
CREATE POLICY "HR or admin manage job openings" ON public.job_openings
FOR ALL TO authenticated USING (is_hr_or_admin()) WITH CHECK (is_hr_or_admin());

ALTER TABLE public.job_applications
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS national_id text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS education_level text,
  ADD COLUMN IF NOT EXISTS institution text,
  ADD COLUMN IF NOT EXISTS years_experience numeric,
  ADD COLUMN IF NOT EXISTS current_employer text,
  ADD COLUMN IF NOT EXISTS current_position text,
  ADD COLUMN IF NOT EXISTS expected_salary numeric,
  ADD COLUMN IF NOT EXISTS availability_date date,
  ADD COLUMN IF NOT EXISTS cover_letter text,
  ADD COLUMN IF NOT EXISTS referees text,
  ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS opening_id uuid REFERENCES public.job_openings(id) ON DELETE SET NULL;
