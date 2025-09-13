-- Simple Super Admin Creation (Core User Only)
-- This creates just the essential super admin user without user_profiles dependency

-- Insert the super admin user with generated password hash
INSERT INTO public.users (
  id,
  name,
  username, 
  email,
  password_hash,
  phone,
  role,
  department,
  designation,
  status,
  join_date,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'Super Administrator',
  'superadmin',
  'admin@crmdmhca.com',
  '$2b$10$B03YPnl4VQigeTICviinTu6oTWUNwi10CtT4xEH2VxKZvmKCX2Y46', -- Password: SuperAdmin@123
  '+91-9999999999',
  'super_admin',
  'Administration',
  'Super Administrator',
  'active',
  CURRENT_DATE,
  NOW(),
  NOW()
) ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  department = EXCLUDED.department,
  designation = EXCLUDED.designation,
  status = EXCLUDED.status,
  updated_at = NOW();

-- Verify the user was created
SELECT 
  id,
  name,
  username,
  email,
  role,
  status,
  department,
  designation,
  created_at
FROM public.users 
WHERE email = 'admin@crmdmhca.com';

-- Display login credentials
SELECT 
  '=== SUPER ADMIN CREDENTIALS ===' as info,
  'Email: admin@crmdmhca.com' as login_email,
  'Username: superadmin' as login_username,  
  'Password: SuperAdmin@123' as login_password,
  'Role: super_admin' as user_role,
  '⚠️  CHANGE PASSWORD AFTER FIRST LOGIN! ⚠️' as security_note;

-- Show success message
SELECT 'Super Admin user created successfully! Login with email/username and password above.' as result;