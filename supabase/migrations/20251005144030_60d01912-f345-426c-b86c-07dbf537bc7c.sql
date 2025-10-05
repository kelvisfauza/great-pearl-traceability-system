-- Create network_whitelist table
CREATE TABLE IF NOT EXISTS public.network_whitelist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.network_whitelist ENABLE ROW LEVEL SECURITY;

-- Only admins can manage network whitelist
CREATE POLICY "Admins can manage network whitelist"
ON public.network_whitelist
FOR ALL
USING (is_current_user_admin());

-- Insert the Great Pearl Coffee Factory IP
INSERT INTO public.network_whitelist (ip_address, description, created_by)
VALUES ('102.86.1.226', 'Great Pearl Coffee Factory - Main Office', 'System')
ON CONFLICT (ip_address) DO NOTHING;

-- Create function to check if IP is whitelisted
CREATE OR REPLACE FUNCTION public.is_ip_whitelisted(check_ip TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.network_whitelist 
    WHERE ip_address = check_ip 
    AND is_active = true
  );
END;
$$;

-- Create trigger for updated_at
CREATE TRIGGER update_network_whitelist_updated_at
  BEFORE UPDATE ON public.network_whitelist
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();