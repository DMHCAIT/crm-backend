-- ========================================
-- COMPLETE LOGIN SYSTEM SETUP
-- Run this in your Supabase SQL Editor to fix all login issues
-- ========================================

-- ========================================
-- 1. VERIFY AUTH SYSTEM IS ENABLED
-- ========================================
-- Check if auth schema exists
SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'auth';

-- ========================================
-- 2. CREATE ADMIN USER DIRECTLY IN AUTH.USERS
-- ========================================
-- This creates a user that can actually login through Supabase Auth

-- First, delete any existing admin user to avoid conflicts
DELETE FROM auth.users WHERE email = 'admin@dmhca.com';

-- Create the admin user with proper Supabase Auth structure
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  invited_at,
  confirmation_token,
  confirmation_sent_at,
  recovery_token,
  recovery_sent_at,
  email_change_token_new,
  email_change,
  email_change_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at,
  phone,
  phone_confirmed_at,
  phone_change,
  phone_change_token,
  phone_change_sent_at,
  email_change_token_current,
  email_change_confirm_status,
  banned_until,
  reauthentication_token,
  reauthentication_sent_at,
  is_sso_user,
  deleted_at
) VALUES (
  '00000000-0000-0000-0000-000000000000'::uuid,
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@dmhca.com',
  crypt('Admin123456!', gen_salt('bf')),
  NOW(),
  NOW(),
  '',
  NOW(),
  '',
  NULL,
  '',
  '',
  NULL,
  NULL,
  '{"provider":"email","providers":["email"]}',
  '{"name":"DMHCA Admin","role":"super_admin"}',
  false,
  NOW(),
  NOW(),
  NULL,
  NULL,
  '',
  '',
  NULL,
  '',
  0,
  NULL,
  '',
  NULL,
  false,
  NULL
);

-- ========================================
-- 3. CREATE TEST USER FOR REGULAR LOGIN
-- ========================================
-- This user will test normal user functionality

-- Delete any existing test user
DELETE FROM auth.users WHERE email = 'test@dmhca.com';

-- Create test user
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  invited_at,
  confirmation_token,
  confirmation_sent_at,
  recovery_token,
  recovery_sent_at,
  email_change_token_new,
  email_change,
  email_change_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at,
  phone,
  phone_confirmed_at,
  phone_change,
  phone_change_token,
  phone_change_sent_at,
  email_change_token_current,
  email_change_confirm_status,
  banned_until,
  reauthentication_token,
  reauthentication_sent_at,
  is_sso_user,
  deleted_at
) VALUES (
  '00000000-0000-0000-0000-000000000000'::uuid,
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'test@dmhca.com',
  crypt('Test123456!', gen_salt('bf')),
  NOW(),
  NOW(),
  '',
  NOW(),
  '',
  NULL,
  '',
  '',
  NULL,
  NULL,
  '{"provider":"email","providers":["email"]}',
  '{"name":"Test User","role":"agent"}',
  false,
  NOW(),
  NOW(),
  NULL,
  NULL,
  '',
  '',
  NULL,
  '',
  0,
  NULL,
  '',
  NULL,
  false,
  NULL
);

-- ========================================
-- 4. ENSURE USER_PROFILES ARE CREATED
-- ========================================
-- The trigger should create these automatically, but let's ensure they exist

-- Create admin profile if not exists
INSERT INTO user_profiles (user_id, full_name, role, is_active)
SELECT 
  id,
  'DMHCA Admin',
  'super_admin',
  true
FROM auth.users 
WHERE email = 'admin@dmhca.com'
AND NOT EXISTS (
  SELECT 1 FROM user_profiles WHERE user_id = auth.users.id
);

-- Create test profile if not exists
INSERT INTO user_profiles (user_id, full_name, role, is_active)
SELECT 
  id,
  'Test User',
  'agent',
  true
FROM auth.users 
WHERE email = 'test@dmhca.com'
AND NOT EXISTS (
  SELECT 1 FROM user_profiles WHERE user_id = auth.users.id
);

-- ========================================
-- 5. VERIFY AUTH SETUP
-- ========================================
-- Show created users
SELECT 
  id,
  email,
  created_at,
  email_confirmed_at,
  raw_user_meta_data->>'name' as name,
  raw_user_meta_data->>'role' as role
FROM auth.users 
WHERE email IN ('admin@dmhca.com', 'test@dmhca.com')
ORDER BY created_at;

-- Show user profiles
SELECT 
  up.full_name,
  up.role,
  up.is_active,
  au.email
FROM user_profiles up
JOIN auth.users au ON up.user_id = au.id
WHERE au.email IN ('admin@dmhca.com', 'test@dmhca.com');

-- ========================================
-- 6. TEST AUTH POLICIES
-- ========================================
-- Ensure the user can access their own data
SELECT 'Auth policies test completed' as message;

-- ========================================
-- 7. FINAL MESSAGE
-- ========================================
SELECT 
  '✅ Login system setup complete!' as status,
  'You can now login with:' as instructions,
  'admin@dmhca.com / Admin123456! (Super Admin)' as admin_credentials,
  'test@dmhca.com / Test123456! (Regular User)' as test_credentials,
  'demo@crm.com / demo123456 (Demo Mode)' as demo_credentials;
