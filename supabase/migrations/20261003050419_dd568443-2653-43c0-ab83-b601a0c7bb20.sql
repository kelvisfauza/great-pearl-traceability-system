INSERT INTO airtime_batch_items (batch_id, employee_email, employee_name, phone, amount, included, payment_status)
VALUES
  ('2c3d7dad-e6ac-4caf-b239-18c3816cea2b', 'onesmusrubambura@greatpearlcoffee.com', 'Rubambura Kakuhi Onesmus', '0778479944', 10000, true, 'pending'),
  ('2c3d7dad-e6ac-4caf-b239-18c3816cea2b', 'nuwagabagadaffi@greatpearlcoffee.com', 'Niwagaba Gadaffi', '0779448188', 10000, true, 'pending');

UPDATE airtime_batches
SET total_amount = 150000,
    recipient_count = 14,
    updated_at = now()
WHERE id = '2c3d7dad-e6ac-4caf-b239-18c3816cea2b';