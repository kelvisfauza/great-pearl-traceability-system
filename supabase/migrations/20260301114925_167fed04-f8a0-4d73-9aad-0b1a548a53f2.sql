-- Add unique constraint on email to enforce one biometric credential per account
-- First check if constraint already exists (the table may already have one)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'biometric_credentials_email_unique'
  ) THEN
    -- Delete any duplicate email entries, keeping the oldest one
    DELETE FROM public.biometric_credentials a
    USING public.biometric_credentials b
    WHERE a.email = b.email 
    AND a.created_at > b.created_at;

    ALTER TABLE public.biometric_credentials 
    ADD CONSTRAINT biometric_credentials_email_unique UNIQUE (email);
  END IF;
END $$;