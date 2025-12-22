-- Allow admins to delete christmas vouchers for recalculation
CREATE POLICY "Admins can delete vouchers"
ON public.christmas_vouchers
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM employees
  WHERE employees.email = ((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text)
  AND employees.role = ANY (ARRAY['Administrator'::text, 'Super Admin'::text])
));

-- Delete existing vouchers for recalculation
DELETE FROM christmas_vouchers WHERE year = 2025;

-- Insert recalculated vouchers based on actual activity data
INSERT INTO christmas_vouchers (employee_id, employee_email, employee_name, voucher_amount, performance_rank, performance_score, christmas_message, year)
VALUES
  -- Rank 1: Denis - 44,526 activities (highest performer)
  ('3bfd4285-343d-4991-aa06-78ace1479afb', 'bwambaledenis@greatpearlcoffee.com', 'Bwambale Denis', 100000, 1, 100, 'Merry Christmas! Outstanding performance this year - you are our TOP performer! Thank you for your incredible dedication! 🎄', 2025),
  
  -- Rank 2: Shafik Yeda - 21,004 activities
  ('e56f6fb1-057c-47e2-b8b3-45ae710d4221', 'bwambaletony@greatpearlcoffee.com', 'Shafik Yeda', 55000, 2, 47, 'Merry Christmas! Exceptional work this year - you are among our best performers! 🌟', 2025),
  
  -- Rank 3: Tumwine Alex - 20,664 activities
  ('4ccf60bd-d4df-4f9e-befe-a145a7f99b62', 'tumwinealex@greatpearlcoffee.com', 'Tumwine Alex', 45000, 3, 46, 'Merry Christmas! Great dedication this year - keep up the excellent work! ✨', 2025),
  
  -- Rank 4: Sserunkuma Taufiq - 15,022 activities
  ('bdb0cc7f-6636-42e6-a8fb-a925e51d1c03', 'sserunkumataufique@greatpearlcoffee.com', 'Sserunkuma Taufiq', 35000, 4, 34, 'Merry Christmas! Your consistent efforts are truly appreciated! 🎅', 2025),
  
  -- Rank 5: Musema Wyclif - 12,862 activities
  ('38bf0365-c6e7-4d4f-abad-c869a9990ee0', 'musemawyclif@greatpearlcoffee.com', 'Musema Wyclif', 35000, 5, 29, 'Merry Christmas! Thank you for your valuable contributions! 🎁', 2025),
  
  -- Rank 6: Fauza Kusa - 9,326 activities
  ('ba816db1-ad13-486e-8754-17a6abd11532', 'fauzakusa@greatpearlcoffee.com', 'Fauza Kusa', 30000, 6, 21, 'Merry Christmas! Wishing you joy and success in the coming year! ❄️', 2025),
  
  -- Rank 7: Kibaba Nicholus - 8,641 activities
  ('9c9f1e6c-a2f4-425e-a97c-622bc52c2e6a', 'nickscott@greatpearlcoffee.com', 'Kibaba Nicholus', 17000, 7, 19, 'Merry Christmas! Thank you for being part of the Great Pearl Coffee family! 🎄', 2025),
  
  -- Rank 8: Morjalia Jadens - 7,479 activities
  ('de39d5d6-2b0f-4d7b-9833-7fee52b09ae1', 'bwambalemorjalia@greatpearlcoffee.com', 'Morjalia Jadens', 17000, 8, 17, 'Merry Christmas! May this season bring you happiness and peace! 🌟', 2025),
  
  -- Rank 9: Kelvis Fauza - 7,022 activities
  ('c31bde5d-9890-4e4e-803d-ce73218968af', 'kelvifauza@gmail.com', 'Kelvis Fauza', 17000, 9, 16, 'Merry Christmas! Your hard work is appreciated! ✨', 2025),
  
  -- Rank 10: Bwambale Benson - 5,661 activities
  ('0cc106f6-6004-4c15-aab3-4efe4bc00ca7', 'bwambalebenson@greatpearlcoffee.com', 'Bwambale Benson', 17000, 10, 13, 'Merry Christmas! Thank you for your dedication to Great Pearl Coffee! 🎅', 2025),
  
  -- Rank 11: Artwanzire Timothy - 2,054 activities
  ('6a1a2e65-4d07-4e0d-a016-34143297caaa', 'tatwanzire@greatpearlcoffee.com', 'Artwanzire Timothy', 16000, 11, 5, 'Merry Christmas! Wishing you wonderful holidays! 🎁', 2025),
  
  -- Rank 12: Adinan Kariim - 1,021 activities (new employee)
  ('c016358d-25d3-410f-bfba-694ae5d620ef', 'adinankariim@greatpearlcoffee.com', 'Adinan Kariim', 16000, 12, 2, 'Merry Christmas! Welcome to the team and wishing you a blessed holiday season! ❄️', 2025);