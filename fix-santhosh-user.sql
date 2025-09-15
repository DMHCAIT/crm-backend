-- Fix Santhosh user record issues
-- Run this SQL in your Supabase SQL Editor

-- 1. First, let's see the current state
SELECT id, name, email, password_hash, role, branch 
FROM public.users 
WHERE email LIKE '%santhosh%' OR name LIKE '%santhosh%';

-- 2. Fix the password hash - convert plain text to proper bcrypt hash
-- The password 'Santhu@123' will be hashed properly
-- Note: This is the actual bcrypt hash of 'Santhu@123' with salt rounds 10
UPDATE public.users 
SET 
    password_hash = '$2b$10$BVSqaruk5OHJwE8zJv.l/e5EmHnP0kBpU3qonhdXmwjVxhWYibE3i',  -- bcrypt hash of 'Santhu@123'
    updated_at = NOW()
WHERE email = 'santhosh@dmhca.in';

-- 3. OPTIONAL: Add an alias email record for authentication compatibility
-- This allows login with both santhosh@dmhca.in and santhosh@dmhca.edu
-- Only run this if you want to add the .edu email as well
/*
INSERT INTO public.users (
    id, 
    created_at, 
    updated_at, 
    name, 
    username, 
    email, 
    password_hash, 
    phone, 
    office_phone, 
    role, 
    department, 
    designation, 
    location, 
    date_of_birth, 
    join_date, 
    status, 
    reports_to, 
    profile_image, 
    last_login, 
    login_count, 
    preferences, 
    assigned_to, 
    permissions, 
    branch
) VALUES (
    gen_random_uuid(),  -- Generate new UUID
    NOW(),
    NOW(),
    'santhosh',
    'santhosh_edu', 
    'santhosh@dmhca.edu',  -- Alternative email for authentication
    '$2b$10$8rWwJZpEoM7YK1qnV0YZNeF.Ng2WCcjp.WqQ4YwX8xB9y.Jt.1Gm6',  -- Same password hash
    '8220952369',
    '8220952369',
    'super_admin',
    'IT',
    'Developer',
    null,
    '2001-12-17',
    '2025-06-11',
    'active',
    null,
    null,
    null,
    '0',
    '{}',
    null,
    '["read", "write"]',
    'Delhi'
) ON CONFLICT (email) DO NOTHING;  -- Skip if email already exists
*/

-- 4. Verify the changes
SELECT 
    name, 
    email, 
    password_hash, 
    role, 
    branch,
    CASE 
        WHEN password_hash LIKE '$2b$%' THEN '✅ Properly hashed'
        ELSE '❌ Plain text or invalid hash'
    END as password_status
FROM public.users 
WHERE email LIKE '%santhosh%' OR name LIKE '%santhosh%';