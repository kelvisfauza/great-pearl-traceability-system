-- Update the main account (user with 91100 balance) to have 300,000 salary
-- First, link this user to an employee record for salary processing
UPDATE public.employees 
SET auth_user_id = '5fe8c99d-ee15-484d-8765-9bd4b37f961f', salary = 300000
WHERE name = 'Admin User' OR email = 'admin@greatpearlcoffee.com';

-- Clear any existing ledger entries for this user to reset the balance
DELETE FROM public.ledger_entries WHERE user_id = '5fe8c99d-ee15-484d-8765-9bd4b37f961f';

-- Update user account balance to 0 to start fresh
UPDATE public.user_accounts 
SET current_balance = 0, total_earned = 0, total_withdrawn = 0 
WHERE user_id = '5fe8c99d-ee15-484d-8765-9bd4b37f961f';

-- Trigger the daily salary processing to credit the working days for this month
SELECT net.http_post(
    url:='https://pudfybkyfedeggmokhco.supabase.co/functions/v1/process-daily-salary',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1ZGZ5Ymt5ZmVkZWdnbW9raGNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNDAxNjEsImV4cCI6MjA2NzkxNjE2MX0.RSK-BwEjyRMn9YM998_93-W9g8obmjnLXgOgTrIAZJk"}'::jsonb,
    body:='{"main_account_setup": true}'::jsonb
) as salary_processing_request;