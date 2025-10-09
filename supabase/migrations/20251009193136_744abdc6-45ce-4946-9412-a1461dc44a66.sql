-- Fix the overtime award email mismatch and apply the claim
UPDATE overtime_awards 
SET 
  employee_email = 'kelvifauza@gmail.com',
  status = 'claimed',
  reference_number = 'OT-1760037944352-7AFLS5UX2',
  claimed_at = now()
WHERE id = '45b11b5e-6812-4086-a53e-898df1ddf72a';

-- Also fix the other awards with the same email issue
UPDATE overtime_awards 
SET employee_email = 'kelvifauza@gmail.com'
WHERE employee_email = 'kelviskusa@gmail.com';