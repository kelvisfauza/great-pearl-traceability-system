-- Reset Benson's voucher to claimed status so it can be completed properly
UPDATE christmas_vouchers 
SET status = 'claimed', completed_at = NULL, completed_by = NULL 
WHERE voucher_code = 'XMAS-083CD5C6';