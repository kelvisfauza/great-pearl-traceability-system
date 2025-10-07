-- Add avatar_url column to employees table
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.employees.avatar_url IS 'URL to user profile picture stored in profile_pictures bucket';