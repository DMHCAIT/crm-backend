-- 🔍 HIERARCHY TEST FOR AKSHAY'S TEAM
-- Run this in Supabase SQL Editor to verify the hierarchy setup

-- 1. Check Akshay's user record
SELECT 
    id,
    name,
    username,
    email,
    role,
    reports_to,
    status,
    (SELECT name FROM users u2 WHERE u2.id = u1.reports_to) as supervisor_name
FROM users u1 
WHERE name ILIKE '%akshay%' OR username ILIKE '%akshay%';

-- 2. Check who reports to Akshay
SELECT 
    subordinate.id,
    subordinate.name,
    subordinate.username,
    subordinate.email,
    subordinate.role,
    subordinate.reports_to,
    supervisor.name as supervisor_name
FROM users subordinate
JOIN users supervisor ON subordinate.reports_to = supervisor.id
WHERE supervisor.name ILIKE '%akshay%' OR supervisor.username ILIKE '%akshay%';

-- 3. Full hierarchy view
SELECT 
    CASE 
        WHEN u1.reports_to IS NULL THEN '🔝 ' || u1.name || ' (' || u1.role || ')'
        ELSE '├── ' || u1.name || ' (' || u1.role || ') → Reports to ' || u2.name
    END as hierarchy_display,
    u1.id,
    u1.name,
    u1.username,
    u1.email,
    u1.role,
    u1.reports_to,
    u1.status
FROM users u1
LEFT JOIN users u2 ON u1.reports_to = u2.id
WHERE u1.status = 'active'
ORDER BY 
    CASE u1.role 
        WHEN 'super_admin' THEN 1
        WHEN 'senior_manager' THEN 2
        WHEN 'manager' THEN 3
        WHEN 'team_leader' THEN 4
        WHEN 'counselor' THEN 5
        ELSE 6
    END, u1.name;

-- 4. Test the specific hierarchy lookup that the API uses
-- This simulates exactly what the assignable-users API does

-- Find Akshay's user ID (replace with actual ID from query 1)
WITH akshay_user AS (
    SELECT id, name, username, role 
    FROM users 
    WHERE name ILIKE '%akshay%' OR username ILIKE '%akshay%'
    LIMIT 1
),
-- Recursive subordinate lookup (simulating the API logic)
subordinates_recursive AS (
    -- Base case: direct reports to Akshay
    SELECT 
        u.id,
        u.name,
        u.username,
        u.role,
        u.reports_to,
        1 as level,
        'Direct Report' as relationship
    FROM users u, akshay_user a
    WHERE u.reports_to = a.id
    
    UNION ALL
    
    -- Recursive case: reports of reports (up to 3 levels)
    SELECT 
        u.id,
        u.name,
        u.username,
        u.role,
        u.reports_to,
        sr.level + 1,
        'Indirect Report (Level ' || (sr.level + 1) || ')' as relationship
    FROM users u
    INNER JOIN subordinates_recursive sr ON u.reports_to = sr.id
    WHERE sr.level < 3
)
SELECT 
    'Akshay can assign leads to:' as description,
    COUNT(*) + 1 as total_assignable -- +1 for Akshay himself
FROM subordinates_recursive

UNION ALL

SELECT 
    'Breakdown:',
    NULL
FROM subordinates_recursive
LIMIT 1

UNION ALL

SELECT 
    '• ' || name || ' (' || role || ') - ' || relationship as description,
    NULL as count
FROM subordinates_recursive
ORDER BY count DESC NULLS LAST;

-- 5. Check for any data type issues with reports_to field
SELECT 
    'reports_to field analysis' as check_type,
    pg_typeof(reports_to) as data_type,
    COUNT(*) as count
FROM users
GROUP BY pg_typeof(reports_to);

-- 6. Final verification - show exact API simulation
SELECT 
    'API Simulation Results:' as title,
    json_build_object(
        'current_user', json_build_object(
            'id', a.id,
            'name', a.name,
            'username', a.username,
            'role', a.role
        ),
        'subordinates', json_agg(
            json_build_object(
                'id', s.id,
                'name', s.name,
                'username', s.username,
                'role', s.role,
                'reports_to', s.reports_to
            )
        ),
        'subordinate_count', COUNT(s.id)
    ) as api_result
FROM users a
LEFT JOIN users s ON s.reports_to = a.id
WHERE (a.name ILIKE '%akshay%' OR a.username ILIKE '%akshay%')
  AND a.status = 'active'
GROUP BY a.id, a.name, a.username, a.role;