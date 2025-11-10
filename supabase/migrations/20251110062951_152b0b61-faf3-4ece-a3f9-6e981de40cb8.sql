
-- Add SMS notification tracking to messages table
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS sms_notification_sent boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS sms_notification_sent_at timestamp with time zone;

-- Create index for better performance when checking unread messages
CREATE INDEX IF NOT EXISTS idx_messages_sms_notification ON public.messages(sms_notification_sent, read_at, created_at);

-- Create function to check for unread messages older than 20 minutes
CREATE OR REPLACE FUNCTION check_unread_messages_for_sms()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- This function will be called by an edge function to identify messages
  -- that need SMS notifications after 20 minutes
  RETURN;
END;
$$;
