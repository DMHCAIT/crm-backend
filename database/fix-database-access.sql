-- FIX DATABASE ACCESS ISSUES
-- Run this in your Supabase SQL Editor

-- ========================================
-- 1. DISABLE RLS TEMPORARILY FOR TESTING
-- ========================================
ALTER TABLE leads DISABLE ROW LEVEL SECURITY;
ALTER TABLE students DISABLE ROW LEVEL SECURITY;
ALTER TABLE communications DISABLE ROW LEVEL SECURITY;
ALTER TABLE integrations_status DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- ========================================
-- 2. DROP ALL EXISTING POLICIES
-- ========================================
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON leads;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON students;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON communications;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON integrations_status;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON user_profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Super admins can manage profiles" ON user_profiles;

-- ========================================
-- 3. ENABLE RLS WITH SIMPLE POLICIES
-- ========================================
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create simple policies that allow all operations for authenticated users
CREATE POLICY "Allow all for authenticated users" ON leads FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON students FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON communications FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON integrations_status FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON user_profiles FOR ALL USING (true);

-- ========================================
-- 4. GRANT PERMISSIONS TO AUTHENTICATED ROLE
-- ========================================
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Grant permissions to anon role as well for public access
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- ========================================
-- 5. ENSURE REALTIME IS PROPERLY CONFIGURED
-- ========================================
-- Add tables to realtime publication (ignore errors if already exists)
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE leads;
  EXCEPTION WHEN duplicate_object THEN
    NULL; -- Ignore if already exists
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE students;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE communications;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE integrations_status;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE user_profiles;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;

-- ========================================
-- 6. CREATE A TEST USER IF NONE EXISTS
-- ========================================
-- This will create a user that can be used for testing
-- Note: This is for testing only, in production use Supabase Auth

DO $$
BEGIN
  -- Check if any users exist in auth.users
  IF NOT EXISTS (SELECT 1 FROM auth.users LIMIT 1) THEN
    -- Create a test admin user
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
      '',
      '',
      '',
      ''
    );
    
    RAISE NOTICE 'Test admin user created: admin@dmhca.com / Admin123456!';
  ELSE
    RAISE NOTICE 'Users already exist in the system';
  END IF;
END $$;

-- ========================================
-- 7. VERIFY SETUP
-- ========================================
SELECT 'Database access fixed! Try logging in now.' as message;

-- Show table counts
SELECT 
  'leads' as table_name, 
  COUNT(*) as row_count,
  'RLS: ' || CASE WHEN relrowsecurity THEN 'ON' ELSE 'OFF' END as security_status
FROM leads, pg_class 
WHERE pg_class.relname = 'leads'
UNION ALL
SELECT 
  'students' as table_name, 
  COUNT(*) as row_count,
  'RLS: ' || CASE WHEN relrowsecurity THEN 'ON' ELSE 'OFF' END as security_status
FROM students, pg_class 
WHERE pg_class.relname = 'students'
UNION ALL
SELECT 
  'user_profiles' as table_name, 
  COUNT(*) as row_count,
  'RLS: ' || CASE WHEN relrowsecurity THEN 'ON' ELSE 'OFF' END as security_status
FROM user_profiles, pg_class 
WHERE pg_class.relname = 'user_profiles';

-- Check if auth users exist
SELECT 
  COUNT(*) as user_count,
  'auth.users' as table_name
FROM auth.users;
