UPDATE public.employees
SET permissions = (
  SELECT ARRAY(
    SELECT DISTINCT unnest(
      COALESCE(permissions, ARRAY[]::text[]) || ARRAY[
        'Procurement:view','Procurement:create','Procurement:edit','Procurement:process',
        'Procurement:approve','Procurement:print','Procurement:download','Procurement:export',
        'Procurement:manage',
        'Reports:print','Reports:export',
        'Company Forms:view','Company Forms:create','Company Forms:print','Company Forms:download','Company Forms:export'
      ]::text[]
    )
  )
),
updated_at = now()
WHERE email = 'tatwanzire@greatpearlcoffee.com';