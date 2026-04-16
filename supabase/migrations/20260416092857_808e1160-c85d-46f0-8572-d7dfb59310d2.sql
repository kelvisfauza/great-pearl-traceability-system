-- Fix Alex's date of birth from 2026-04-16 to 2003-04-16
UPDATE employees SET date_of_birth = '2003-04-16', updated_at = now() WHERE id = '4ccf60bd-d4df-4f9e-befe-a145a7f99b62';