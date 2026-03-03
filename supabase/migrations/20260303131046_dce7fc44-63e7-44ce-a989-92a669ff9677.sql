-- Update Timothy's salary to 200,000
UPDATE public.employees SET salary = 200000, updated_at = now() WHERE email = 'tatwanzire@greatpearlcoffee.com';

-- Verify Benson's salary is already 200,000 (no change needed)
-- Benson: bwambalebenson@greatpearlcoffee.com already has salary = 200000