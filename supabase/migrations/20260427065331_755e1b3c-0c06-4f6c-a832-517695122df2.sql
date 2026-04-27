UPDATE public.employees
SET permissions = (
  SELECT ARRAY(SELECT DISTINCT unnest(
    COALESCE(permissions, ARRAY[]::text[]) || ARRAY[
      'IT Management:view',
      'IT Management:create',
      'IT Management:edit',
      'IT Management:delete',
      'IT Management:manage',
      'IT Management:approve',
      'IT Management:export',
      'IT Management:print',
      'IT Management:download',
      'User Management:view',
      'User Management:create',
      'User Management:edit',
      'User Management:manage',
      'IT',
      'IT Department'
    ]
  ))
),
updated_at = now()
WHERE email = 'tatwanzire@greatpearlcoffee.com';