
INSERT INTO bonuses (id, employee_id, employee_email, employee_name, amount, reason, status, allocated_by, allocated_at)
VALUES (
  gen_random_uuid(),
  'ba816db1-ad13-486e-8754-17a6abd11532',
  'fauzakusa@greatpearlcoffee.com',
  'Fauza Kusa 2',
  15000,
  'March 2026 Overtime Reward (Test): 15 hrs net overtime × 1,000 UGX/hr',
  'pending',
  'system',
  now()
);
