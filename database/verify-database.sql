-- Database Verification Script
-- Run this in your Supabase SQL Editor to check if everything is set up

-- Check if tables exist
SELECT 
  schemaname,
  tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- Check if auth is enabled
SELECT 
  schemaname,
  tablename 
FROM pg_tables 
WHERE schemaname = 'auth' 
  AND tablename = 'users';

-- Check if any users exist
SELECT 
  id,
  email,
  created_at,
  email_confirmed_at
FROM auth.users 
ORDER BY created_at DESC;

-- Check if your tables have data
SELECT 'leads' as table_name, COUNT(*) as count FROM leads
UNION ALL
SELECT 'students' as table_name, COUNT(*) as count FROM students
UNION ALL
SELECT 'communications' as table_name, COUNT(*) as count FROM communications;
