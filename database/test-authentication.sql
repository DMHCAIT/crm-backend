-- Test query to check if user profile was created
-- Run this in Supabase SQL Editor after creating a user

SELECT 
    up.user_id,
    up.email,
    up.full_name,
    up.role,
    up.created_at,
    'Profile exists' as status
FROM user_profiles up
WHERE up.email = 'admin@dmhca.com';

-- If no results, check if user exists in auth
-- (You can see this in Authentication > Users tab)

-- Expected result:
-- user_id: [some UUID]
-- email: admin@dmhca.com  
-- full_name: Super Admin
-- role: super_admin
-- created_at: [timestamp]
-- status: Profile exists
