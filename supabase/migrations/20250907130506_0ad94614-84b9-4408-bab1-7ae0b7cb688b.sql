-- Create login_tokens table for SMS auto-login
CREATE TABLE public.login_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token UUID NOT NULL UNIQUE,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  auth_user_id UUID,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.login_tokens ENABLE ROW LEVEL SECURITY;

-- Create policies (restrictive - only the system can manage these)
CREATE POLICY "System can manage login tokens" 
ON public.login_tokens 
FOR ALL 
USING (false);

-- Create index for performance
CREATE INDEX idx_login_tokens_token ON public.login_tokens(token);
CREATE INDEX idx_login_tokens_expires ON public.login_tokens(expires_at);