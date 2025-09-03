-- Create announcements table for company-wide announcements
CREATE TABLE public.announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  target_departments TEXT[] DEFAULT '{}',
  target_roles TEXT[] DEFAULT '{}',
  send_sms BOOLEAN NOT NULL DEFAULT false,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sent_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent')),
  recipients_count INTEGER DEFAULT 0,
  sms_sent_count INTEGER DEFAULT 0
);

-- Enable Row Level Security
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view announcements" 
ON public.announcements 
FOR SELECT 
USING (true);

CREATE POLICY "Only admins can create announcements" 
ON public.announcements 
FOR INSERT 
WITH CHECK (is_current_user_admin());

CREATE POLICY "Only admins can update announcements" 
ON public.announcements 
FOR UPDATE 
USING (is_current_user_admin());

CREATE POLICY "Only admins can delete announcements" 
ON public.announcements 
FOR DELETE 
USING (is_current_user_admin());

-- Add trigger for timestamps
CREATE TRIGGER update_announcements_updated_at
BEFORE UPDATE ON public.announcements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();