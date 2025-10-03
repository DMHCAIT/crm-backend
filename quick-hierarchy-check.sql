-- QUICK HIERARCHY DEBUG - Run this in Supabase SQL Editor
-- This will show exactly what's wrong with your user hierarchy setup

-- 1. Check current user hierarchy
SELECT 
    u1.name as user_name,
    u1.username,
    u1.role,
    u1.email,
    u2.name as reports_to_name,
    u2.username as reports_to_username,
    u2.role as reports_to_role,
    u1.reports_to as reports_to_id
FROM users u1
LEFT JOIN users u2 ON u1.reports_to = u2.id
WHERE u1.role IN ('team_leader', 'counselor', 'manager', 'senior_manager')
ORDER BY u1.role, u1.name;

-- 2. Check if ANY reports_to relationships exist
SELECT 
    'Users with reports_to set' as description,
    COUNT(*) as count
FROM users 
WHERE reports_to IS NOT NULL

UNION ALL

SELECT 
    'Users without reports_to' as description,
    COUNT(*) as count
FROM users 
WHERE reports_to IS NULL;

-- 3. Show all users and their roles
SELECT 
    name,
    username,
    role,
    email,
    reports_to,
    created_at
FROM users 
ORDER BY role, name;