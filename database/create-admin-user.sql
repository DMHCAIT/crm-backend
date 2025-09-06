-- Create Admin User in Supabase
-- Run this in your Supabase SQL Editor

-- Create the user directly in auth.users
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@dmhca.com',
  crypt('Admin123456!', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"name": "DMHCA Admin"}',
  false,
  '',
  '',
  '',
  ''
);

-- Note: This is a simplified approach. For production, use Supabase Auth properly.
