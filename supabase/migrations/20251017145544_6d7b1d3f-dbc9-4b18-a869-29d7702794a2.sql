-- Add column to track role notifications
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS last_notified_role text,
ADD COLUMN IF NOT EXISTS role_notification_shown_at timestamp with time zone;

-- Add comment explaining the columns
COMMENT ON COLUMN public.employees.last_notified_role IS 'Tracks the last role the user was notified about to show promotion popup';
COMMENT ON COLUMN public.employees.role_notification_shown_at IS 'Timestamp when the role promotion notification was last shown';