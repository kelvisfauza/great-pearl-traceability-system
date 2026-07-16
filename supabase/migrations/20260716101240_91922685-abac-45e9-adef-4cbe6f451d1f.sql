
ALTER TABLE public.employees DISABLE TRIGGER USER;
ALTER TABLE public.employee_role_locks DISABLE TRIGGER USER;

UPDATE public.employee_role_locks
SET role='IT Officer',
    position='IT & Procurement Officer',
    department='Procurement & IT',
    permissions=ARRAY['Store Management:view','EUDR Documentation:view','Milling:view','Inventory:view','Field Operations:view','Human Resources:view','Logistics:view','Reports:view','Reports:download','Quality Control:view','IT Management:view','IT Management:manage','Procurement:view','Procurement:create','Procurement:edit','Procurement:process'],
    reason='Promoted to IT Officer role',
    updated_at=now()
WHERE email='tatwanzire@greatpearlcoffee.com';

UPDATE public.employees
SET role='IT Officer',
    position='IT & Procurement Officer',
    department='Procurement & IT',
    permissions=ARRAY['Store Management:view','EUDR Documentation:view','Milling:view','Inventory:view','Field Operations:view','Human Resources:view','Logistics:view','Reports:view','Reports:download','Quality Control:view','IT Management:view','IT Management:manage','Procurement:view','Procurement:create','Procurement:edit','Procurement:process'],
    updated_at=now()
WHERE email='tatwanzire@greatpearlcoffee.com';

ALTER TABLE public.employees ENABLE TRIGGER USER;
ALTER TABLE public.employee_role_locks ENABLE TRIGGER USER;
