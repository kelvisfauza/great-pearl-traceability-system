
-- Insert 5 missing Kyagalanyi sales transactions
INSERT INTO public.sales_transactions (date, customer, coffee_type, weight, unit_price, total_amount, truck_details, driver_details, status)
VALUES 
  ('2026-02-09', 'KYAGALANYI COFFEE LTD', 'Arabica', 12215.8, 14700, 179572260, 'N/A', 'N/A', 'Completed'),
  ('2026-02-09', 'KYAGALANYI COFFEE LTD', 'Arabica', 19431.0, 14283, 277532973, 'N/A', 'N/A', 'Completed'),
  ('2026-02-24', 'KYAGALANYI COFFEE LTD', 'Arabica', 35001.0, 14513, 507969513, 'N/A', 'N/A', 'Completed'),
  ('2026-02-26', 'KYAGALANYI COFFEE LTD', 'Arabica', 21953.0, 14660, 321830980, 'N/A', 'N/A', 'Completed'),
  ('2026-03-03', 'KYAGALANYI COFFEE LTD', 'Arabica', 33250.0, 14338, 476738500, 'N/A', 'N/A', 'Completed');
