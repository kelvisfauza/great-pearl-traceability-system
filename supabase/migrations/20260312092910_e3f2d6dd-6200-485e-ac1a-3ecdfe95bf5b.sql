INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, metadata) VALUES
('e4c10711-43e4-4901-9b2a-6f2a5a836240', 'DEPOSIT', 100000, 'SAL-MAR26-YEDA1', '{"description":"Monthly Salary - March 2026","performed_by":"Auto-Salary System"}'),
('b2ad6ccf-536e-4a55-a0ec-6906ad35390f', 'DEPOSIT', 300000, 'SAL-MAR26-DAPHINE', '{"description":"Monthly Salary - March 2026","performed_by":"Auto-Salary System"}'),
('1922048f-c0b9-422e-9b42-47713a75c1ca', 'DEPOSIT', 250000, 'SAL-MAR26-MASEREKA', '{"description":"Monthly Salary - March 2026","performed_by":"Auto-Salary System"}'),
('24edb593-8527-4ced-8225-f5df0d209ccf', 'DEPOSIT', 250000, 'SAL-MAR26-NICHOLUS', '{"description":"Monthly Salary - March 2026","performed_by":"Auto-Salary System"}'),
('eba97d3e-f098-467a-ad78-d0b9639d76a8', 'DEPOSIT', 140000, 'SAL-MAR26-BENSON', '{"description":"Monthly Salary - March 2026 (Advance deduction: UGX 60,000)","performed_by":"Auto-Salary System"}'),
('ff2f07a4-ef00-4f1c-9316-498ddfd38038', 'DEPOSIT', 400000, 'SAL-MAR26-GODWIN', '{"description":"Monthly Salary - March 2026","performed_by":"Auto-Salary System"}'),
('010f057a-92e3-479d-89b2-a801ef851949', 'DEPOSIT', 310000, 'SAL-MAR26-TIMOTHY', '{"description":"Monthly Salary - March 2026 (Advance deduction: UGX 40,000)","performed_by":"Auto-Salary System"}'),
('60fa7376-53ee-4804-9b6c-0eefccd3fc9c', 'DEPOSIT', 300000, 'SAL-MAR26-JADENS', '{"description":"Monthly Salary - March 2026","performed_by":"Auto-Salary System"}'),
('42f96d36-942d-4d63-8bd3-44f573bb1f37', 'DEPOSIT', 300000, 'SAL-MAR26-KELVIS', '{"description":"Monthly Salary - March 2026","performed_by":"Auto-Salary System"}'),
('651c7d8d-d860-463a-9d06-b2852a76975c', 'DEPOSIT', 130000, 'SAL-MAR26-KARIIM', '{"description":"Monthly Salary - March 2026","performed_by":"Auto-Salary System"}'),
('8b590bb1-6cda-47af-96e1-0c35d628a01c', 'DEPOSIT', 250000, 'SAL-MAR26-ALEX', '{"description":"Monthly Salary - March 2026","performed_by":"Auto-Salary System"}'),
('e4c10711-43e4-4901-9b2a-6f2a5a836240', 'DEPOSIT', 200000, 'SAL-MAR26-YEDA2', '{"description":"Monthly Salary - March 2026","performed_by":"Auto-Salary System"}'),
('5ac019de-199c-4a3f-97de-96de786f55dc', 'DEPOSIT', 200000, 'SAL-MAR26-TAUFIQ', '{"description":"Monthly Salary - March 2026","performed_by":"Auto-Salary System"}'),
('7cdf79bf-c024-4107-98a7-3d84dbf0e975', 'DEPOSIT', 500000, 'SAL-MAR26-DENIS', '{"description":"Monthly Salary - March 2026","performed_by":"Auto-Salary System"}'),
('00b188fc-73fe-4ee7-9fe9-956ab2faa6ec', 'DEPOSIT', 300000, 'SAL-MAR26-KUSA', '{"description":"Monthly Salary - March 2026","performed_by":"Auto-Salary System"}'),
('13112b82-bfe6-4629-93ee-522b099318a9', 'DEPOSIT', 450000, 'SAL-MAR26-WYCLIF', '{"description":"Monthly Salary - March 2026","performed_by":"Auto-Salary System"}');

INSERT INTO public.salary_advance_payments (advance_id, employee_email, amount_paid, status, approved_by)
VALUES ('6f94afa4-6c92-4dac-a730-90f97812dd66', 'tatwanzire@greatpearlcoffee.com', 40000, 'approved', 'Manual Correction - Feb 2026');

UPDATE public.salary_advance_payments SET status = 'approved', approved_by = 'System Correction' WHERE id = 'eb7ab81f-11f2-42f8-8746-8ec63227fd7d' AND status = 'pending';