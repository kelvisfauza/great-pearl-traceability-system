
-- Deduct inventory for the 5 missing sales using named parameters
SELECT deduct_from_inventory_batches(
  p_coffee_type := 'Arabica', 
  p_quantity_kg := 12215.8, 
  p_customer := 'KYAGALANYI COFFEE LTD', 
  p_sale_id := 'b901d9eb-a1d4-4dc2-a416-8eefa4cac828'::uuid
);
SELECT deduct_from_inventory_batches(
  p_coffee_type := 'Arabica', 
  p_quantity_kg := 19431.0, 
  p_customer := 'KYAGALANYI COFFEE LTD', 
  p_sale_id := '1527d481-3792-4e84-a99a-75e19d8bc7ba'::uuid
);
SELECT deduct_from_inventory_batches(
  p_coffee_type := 'Arabica', 
  p_quantity_kg := 35001.0, 
  p_customer := 'KYAGALANYI COFFEE LTD', 
  p_sale_id := 'aa73439a-f219-4da2-9180-a9262c5e0ce9'::uuid
);
SELECT deduct_from_inventory_batches(
  p_coffee_type := 'Arabica', 
  p_quantity_kg := 21953.0, 
  p_customer := 'KYAGALANYI COFFEE LTD', 
  p_sale_id := 'bc9eeb77-622f-4589-94b7-c46c3f2a9ba1'::uuid
);
SELECT deduct_from_inventory_batches(
  p_coffee_type := 'Arabica', 
  p_quantity_kg := 33250.0, 
  p_customer := 'KYAGALANYI COFFEE LTD', 
  p_sale_id := '9c6765c0-31e9-4fa8-b18b-f91d01f0df22'::uuid
);
