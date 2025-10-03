-- DEBUG SCRIPT: Check User Hierarchy and Lead Assignment Issues
-- Run this in Supabase SQL Editor to diagnose the problems

-- 1. CHECK USER HIERARCHY SETUP
-- =============================
SELECT 
    u1.name as user_name,
    u1.username,
    u1.role,
    u1.email,
    u2.name as reports_to_name,
    u2.username as reports_to_username,
    u2.role as reports_to_role
FROM users u1
LEFT JOIN users u2 ON u1.reports_to = u2.id
ORDER BY u1.role, u1.name;

-- 2. CHECK SUPER ADMIN USERS
-- ==========================
SELECT 
    name, 
    username, 
    email, 
    role,
    reports_to,
    created_at
FROM users 
WHERE role = 'super_admin'
ORDER BY created_at;

-- 3. CHECK LEAD ASSIGNMENTS
-- =========================
SELECT 
    assignedTo as assigned_to_field,
    assigned_to,
    assignedcounselor,
    COUNT(*) as lead_count
FROM leads 
GROUP BY assignedTo, assigned_to, assignedcounselor
ORDER BY lead_count DESC
LIMIT 20;

-- 4. CHECK HIERARCHY DEPTH
-- ========================
WITH RECURSIVE user_hierarchy AS (
    -- Base case: users with no supervisor (top level)
    SELECT 
        id, 
        name, 
        username, 
        role, 
        reports_to,
        0 as level,
        name as path
    FROM users 
    WHERE reports_to IS NULL
    
    UNION ALL
    
    -- Recursive case: users who report to someone
    SELECT 
        u.id, 
        u.name, 
        u.username, 
        u.role, 
        u.reports_to,
        uh.level + 1,
        uh.path || ' -> ' || u.name as path
    FROM users u
    INNER JOIN user_hierarchy uh ON u.reports_to = uh.id
    WHERE uh.level < 10  -- Prevent infinite loops
)
SELECT 
    level,
    name,
    username,
    role,
    path
FROM user_hierarchy
ORDER BY level, name;

-- 5. CHECK ASSIGNABLE USERS FOR EACH ROLE
-- =======================================
SELECT 
    role,
    COUNT(*) as user_count,
    ARRAY_AGG(name) as users
FROM users 
GROUP BY role
ORDER BY user_count DESC;

-- 6. CHECK LEADS ASSIGNED TO SPECIFIC USERS
-- =========================================
SELECT 
    COALESCE(assignedTo, assigned_to, assignedcounselor, 'UNASSIGNED') as assigned_user,
    COUNT(*) as lead_count
FROM leads
GROUP BY COALESCE(assignedTo, assigned_to, assignedcounselor, 'UNASSIGNED')
ORDER BY lead_count DESC
LIMIT 15;

-- 7. CHECK IF REPORTS_TO RELATIONSHIPS EXIST
-- ==========================================
SELECT 
    'Users with reports_to set' as description,
    COUNT(*) as count
FROM users 
WHERE reports_to IS NOT NULL

UNION ALL

SELECT 
    'Users without reports_to (top level)' as description,
    COUNT(*) as count
FROM users 
WHERE reports_to IS NULL

UNION ALL

SELECT 
    'Total users' as description,
    COUNT(*) as count
FROM users;

-- 8. SPECIFIC USER DEBUGGING (Replace 'your_username' with actual username)
-- ========================================================================
-- Uncomment and modify this section to debug a specific user:
/*
SELECT 
    'Current User Info' as section,
    name, username, role, email, reports_to
FROM users 
WHERE username = 'your_username_here'

UNION ALL

SELECT 
    'Direct Subordinates' as section,
    name, username, role, email, reports_to::text
FROM users 
WHERE reports_to = (SELECT id FROM users WHERE username = 'your_username_here');
*/

-- 9. CHECK API TOKEN USERS (if using JWT)
-- =======================================
SELECT 
    name,
    username,
    email,
    role,
    last_login,
    login_count
FROM users 
WHERE last_login IS NOT NULL
ORDER BY last_login DESC
LIMIT 10;