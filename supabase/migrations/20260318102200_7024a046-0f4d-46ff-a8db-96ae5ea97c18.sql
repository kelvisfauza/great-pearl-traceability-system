UPDATE employees SET permissions = ARRAY[
  'Dashboard:view','IT Management:view','IT Management:create','IT Management:edit','IT Management:manage',
  'Sales:view','Marketing:view','Field Operations:view','EUDR Documentation:view',
  'Quality Control:view','Store Management:view','Inventory:view','Reports:view',
  'Sales Marketing:view','Logistics:view','Finance:approve',
  'Procurement:view','Procurement:create','Procurement:edit','Procurement:manage','Procurement:approve','Procurement:export','Procurement:print'
], updated_at = now() WHERE email = 'tatwanzire@greatpearlcoffee.com';