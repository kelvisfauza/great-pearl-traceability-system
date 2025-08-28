-- Update Denis's permissions to give him meaningful access
UPDATE employees 
SET permissions = ARRAY['Reports', 'Store Management', 'Data Analysis'],
    updated_at = now()
WHERE email = 'bwambaledenis8@gmail.com';