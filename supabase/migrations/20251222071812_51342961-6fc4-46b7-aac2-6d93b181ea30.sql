-- Update voucher amounts: give Kelvis the max (100k), reduce Alex and Shafik
UPDATE christmas_vouchers 
SET voucher_amount = 100000 
WHERE employee_email = 'kelvifauza@gmail.com' AND year = 2025;

UPDATE christmas_vouchers 
SET voucher_amount = 40000 
WHERE employee_email = 'tumwinealex@greatpearlcoffee.com' AND year = 2025;

UPDATE christmas_vouchers 
SET voucher_amount = 30000 
WHERE employee_email = 'bwambaletony@greatpearlcoffee.com' AND year = 2025;