-- Delete Kelvis Fauza and Fauza Kusa vouchers
DELETE FROM christmas_vouchers WHERE employee_email = 'kelvifauza@gmail.com' AND year = 2025;
DELETE FROM christmas_vouchers WHERE employee_email = 'fauzakusa@greatpearlcoffee.com' AND year = 2025;

-- Redistribute 47,000 to ranks 7-12 (5 people get 9,400 extra each)
UPDATE christmas_vouchers SET voucher_amount = 26400 WHERE employee_email = 'nickscott@greatpearlcoffee.com' AND year = 2025;
UPDATE christmas_vouchers SET voucher_amount = 26400 WHERE employee_email = 'bwambalemorjalia@greatpearlcoffee.com' AND year = 2025;
UPDATE christmas_vouchers SET voucher_amount = 26400 WHERE employee_email = 'bwambalebenson@greatpearlcoffee.com' AND year = 2025;
UPDATE christmas_vouchers SET voucher_amount = 25400 WHERE employee_email = 'tatwanzire@greatpearlcoffee.com' AND year = 2025;
UPDATE christmas_vouchers SET voucher_amount = 25400 WHERE employee_email = 'adinankariim@greatpearlcoffee.com' AND year = 2025;