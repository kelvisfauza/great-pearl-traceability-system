-- Update Bwambale Denis: Trader in Trade department
UPDATE public.employees 
SET position = 'Trader', 
    department = 'Trade',
    updated_at = now()
WHERE id = '3bfd4285-343d-4991-aa06-78ace1479afb';

-- Update Musema Wyclif: Assistant Trader & Field Officer
UPDATE public.employees 
SET position = 'Assistant Trader & Field Officer',
    updated_at = now()
WHERE id = '38bf0365-c6e7-4d4f-abad-c869a9990ee0';

-- Update Bwambale Benson: Logistics & EUDR department
UPDATE public.employees 
SET department = 'Logistics & EUDR',
    updated_at = now()
WHERE id = '0cc106f6-6004-4c15-aab3-4efe4bc00ca7';