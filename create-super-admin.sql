-- Create Super Admin User Script for Enhanced CRM Backend
-- This script creates a super admin user with full system access

-- First, let's create the super admin user
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
  '$2b$10$YourHashedPasswordHere', -- Replace with actual bcrypt hash
  '+91-9999999999',
  'super_admin',
  'Administration',
  'Super Administrator',
  'active',
  CURRENT_DATE,
  NOW(),
  NOW()
) ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  username = EXCLUDED.username,
  role = EXCLUDED.role,
  department = EXCLUDED.department,
  designation = EXCLUDED.designation,
  status = EXCLUDED.status,
  updated_at = NOW();

-- Create a user profile for the super admin (skip if user_profiles references auth.users)
-- Note: This will only work if user_profiles.user_id references auth.users(id)
-- If it references public.users(id), you'll need to update the foreign key first

DO $$
DECLARE
    public_user_id uuid;
BEGIN
    -- Get the public.users ID
    SELECT id INTO public_user_id 
    FROM public.users 
    WHERE email = 'admin@crmdmhca.com';
    
    -- Only insert into user_profiles if we have a matching auth.users record
    -- or if the foreign key has been updated to reference public.users
    IF public_user_id IS NOT NULL THEN
        BEGIN
            INSERT INTO public.user_profiles (
              user_id,
              full_name,
              phone,
              role,
              department,
              is_active,
              designation,
              location,
              employee_id,
              hire_date,
              permissions,
              settings,
              timezone,
              created_at,
              updated_at
            ) VALUES (
              public_user_id,
              'Super Administrator',
              '+91-9999999999',
              'super_admin',
              'Administration',
              true,
              'Super Administrator', 
              'Head Office',
              'SA001',
              CURRENT_DATE,
              '{"all": true, "manage_users": true, "manage_system": true, "view_all_data": true, "export_data": true}',
              '{"theme": "light", "notifications": true, "dashboard_layout": "advanced"}',
              'Asia/Kolkata',
              NOW(),
              NOW()
            ) ON CONFLICT (user_id) DO UPDATE SET
              full_name = EXCLUDED.full_name,
              phone = EXCLUDED.phone,
              role = EXCLUDED.role,
              department = EXCLUDED.department,
              is_active = EXCLUDED.is_active,
              designation = EXCLUDED.designation,
              permissions = EXCLUDED.permissions,
              updated_at = NOW();
            
            RAISE NOTICE 'User profile created successfully for user ID: %', public_user_id;
            
        EXCEPTION WHEN foreign_key_violation THEN
            RAISE NOTICE 'Skipping user_profiles insert - foreign key constraint requires auth.users reference';
            RAISE NOTICE 'Super admin created in public.users table successfully';
        END;
    END IF;
END $$;

-- Display the created user information
SELECT 
  u.id,
  u.name,
  u.username,
  u.email,
  u.role,
  u.status,
  up.employee_id
FROM public.users u
LEFT JOIN public.user_profiles up ON u.id = up.user_id
WHERE u.email = 'admin@crmdmhca.com';

-- Show success message
SELECT 'Super Admin user created successfully! Remember to update the password hash.' as result;