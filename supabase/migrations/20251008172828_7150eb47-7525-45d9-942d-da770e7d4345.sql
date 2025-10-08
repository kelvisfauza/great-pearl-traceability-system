-- Add reply functionality to messages table
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES public.messages(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS sender_name text;

-- Create index for better performance when fetching replied messages
CREATE INDEX IF NOT EXISTS idx_messages_reply_to_id ON public.messages(reply_to_id);

-- Update existing messages with sender names from employees table
UPDATE public.messages m
SET sender_name = e.name
FROM public.employees e
WHERE m.sender_id = e.auth_user_id
AND m.sender_name IS NULL;