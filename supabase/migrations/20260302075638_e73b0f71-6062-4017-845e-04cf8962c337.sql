
-- Monthly loyalty reset for February 2026
-- Zero out LOYALTY_REWARD earnings, keeping BONUS entries intact
INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, metadata, created_at)
VALUES
('010f057a-92e3-479d-89b2-a801ef851949', 'ADJUSTMENT', -28160, 'MONTHLY-RESET-FEB2026-010f057a', '{"reason":"Monthly loyalty reset - Feb 2026","type":"monthly_reset"}', '2026-03-01 00:00:01'),
('eba97d3e-f098-467a-ad78-d0b9639d76a8', 'ADJUSTMENT', -14706, 'MONTHLY-RESET-FEB2026-eba97d3e', '{"reason":"Monthly loyalty reset - Feb 2026","type":"monthly_reset"}', '2026-03-01 00:00:01'),
('7cdf79bf-c024-4107-98a7-3d84dbf0e975', 'ADJUSTMENT', -21176, 'MONTHLY-RESET-FEB2026-7cdf79bf', '{"reason":"Monthly loyalty reset - Feb 2026","type":"monthly_reset"}', '2026-03-01 00:00:01'),
('00b188fc-73fe-4ee7-9fe9-956ab2faa6ec', 'ADJUSTMENT', -32267, 'MONTHLY-RESET-FEB2026-00b188fc', '{"reason":"Monthly loyalty reset - Feb 2026","type":"monthly_reset"}', '2026-03-01 00:00:01'),
('1922048f-c0b9-422e-9b42-47713a75c1ca', 'ADJUSTMENT', -31185, 'MONTHLY-RESET-FEB2026-1922048f', '{"reason":"Monthly loyalty reset - Feb 2026","type":"monthly_reset"}', '2026-03-01 00:00:01'),
('b2ad6ccf-536e-4a55-a0ec-6906ad35390f', 'ADJUSTMENT', -124, 'MONTHLY-RESET-FEB2026-b2ad6ccf', '{"reason":"Monthly loyalty reset - Feb 2026","type":"monthly_reset"}', '2026-03-01 00:00:01'),
('60fa7376-53ee-4804-9b6c-0eefccd3fc9c', 'ADJUSTMENT', -112, 'MONTHLY-RESET-FEB2026-60fa7376', '{"reason":"Monthly loyalty reset - Feb 2026","type":"monthly_reset"}', '2026-03-01 00:00:01'),
('ff2f07a4-ef00-4f1c-9316-498ddfd38038', 'ADJUSTMENT', -11043, 'MONTHLY-RESET-FEB2026-ff2f07a4', '{"reason":"Monthly loyalty reset - Feb 2026","type":"monthly_reset"}', '2026-03-01 00:00:01'),
('13112b82-bfe6-4629-93ee-522b099318a9', 'ADJUSTMENT', -29513, 'MONTHLY-RESET-FEB2026-13112b82', '{"reason":"Monthly loyalty reset - Feb 2026","type":"monthly_reset"}', '2026-03-01 00:00:01'),
('e4c10711-43e4-4901-9b2a-6f2a5a836240', 'ADJUSTMENT', -3404, 'MONTHLY-RESET-FEB2026-e4c10711', '{"reason":"Monthly loyalty reset - Feb 2026","type":"monthly_reset"}', '2026-03-01 00:00:01'),
('5ac019de-199c-4a3f-97de-96de786f55dc', 'ADJUSTMENT', -24097, 'MONTHLY-RESET-FEB2026-5ac019de', '{"reason":"Monthly loyalty reset - Feb 2026","type":"monthly_reset"}', '2026-03-01 00:00:01'),
('8b590bb1-6cda-47af-96e1-0c35d628a01c', 'ADJUSTMENT', -24265, 'MONTHLY-RESET-FEB2026-8b590bb1', '{"reason":"Monthly loyalty reset - Feb 2026","type":"monthly_reset"}', '2026-03-01 00:00:01');
