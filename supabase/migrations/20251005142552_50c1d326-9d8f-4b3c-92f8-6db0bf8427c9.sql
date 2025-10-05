-- Create biometric_credentials table for admin fingerprint authentication
CREATE TABLE IF NOT EXISTS public.biometric_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  credential_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.biometric_credentials ENABLE ROW LEVEL SECURITY;

-- Only admins can manage their own biometric credentials
CREATE POLICY "Admins can view own biometric credentials"
  ON public.biometric_credentials
  FOR SELECT
  USING (
    email = auth.jwt() ->> 'email' 
    AND EXISTS (
      SELECT 1 FROM public.employees 
      WHERE employees.email = biometric_credentials.email 
      AND employees.role = 'Administrator'
    )
  );

CREATE POLICY "Admins can insert own biometric credentials"
  ON public.biometric_credentials
  FOR INSERT
  WITH CHECK (
    email = auth.jwt() ->> 'email'
    AND EXISTS (
      SELECT 1 FROM public.employees 
      WHERE employees.email = biometric_credentials.email 
      AND employees.role = 'Administrator'
    )
  );

CREATE POLICY "Admins can update own biometric credentials"
  ON public.biometric_credentials
  FOR UPDATE
  USING (
    email = auth.jwt() ->> 'email'
    AND EXISTS (
      SELECT 1 FROM public.employees 
      WHERE employees.email = biometric_credentials.email 
      AND employees.role = 'Administrator'
    )
  );

-- Create index for faster lookups
CREATE INDEX idx_biometric_credentials_email ON public.biometric_credentials(email);

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_biometric_credentials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_biometric_credentials_updated_at
  BEFORE UPDATE ON public.biometric_credentials
  FOR EACH ROW
  EXECUTE FUNCTION update_biometric_credentials_updated_at();
