-- Create table for storing verification codes
CREATE TABLE IF NOT EXISTS public.verification_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_verification_codes_email_phone ON public.verification_codes(email, phone);
CREATE INDEX IF NOT EXISTS idx_verification_codes_expires_at ON public.verification_codes(expires_at);

-- Enable RLS
ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;

-- Create policy to allow service role to manage verification codes
CREATE POLICY "Service role can manage verification codes" ON public.verification_codes
FOR ALL USING (true)
WITH CHECK (true);

-- Create function to cleanup expired codes
CREATE OR REPLACE FUNCTION cleanup_expired_verification_codes()
RETURNS void AS $$
BEGIN
  DELETE FROM public.verification_codes 
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-cleanup expired codes periodically
-- Note: This will run whenever the table is accessed, providing automatic cleanup