-- 🚀 QUICK HIERARCHY SETUP SCRIPT
-- Run this in Supabase SQL Editor to set up a basic team hierarchy

-- STEP 1: Check current users
SELECT 
    id, 
    name, 
    username, 
    email, 
    role,
    reports_to,
    (SELECT name FROM users u2 WHERE u2.id = u1.reports_to) as current_supervisor
FROM users u1 
ORDER BY 
    CASE role 
        WHEN 'super_admin' THEN 1
        WHEN 'senior_manager' THEN 2  
        WHEN 'manager' THEN 3
        WHEN 'team_leader' THEN 4
        WHEN 'counselor' THEN 5
        ELSE 6
    END, name;

-- STEP 2: Set up basic hierarchy (MODIFY IDs BASED ON STEP 1 OUTPUT)
-- This is an EXAMPLE - you need to replace with actual user IDs from Step 1

-- Example: If you have users like this:
-- Super Admin: Rubeena (ID: 123)  
-- Team Leader: Akshay (ID: 456)
-- Counselors: Others (ID: 789, 321, etc.)

-- UNCOMMENT AND MODIFY THESE BASED ON YOUR ACTUAL USER IDs:

-- Set Team Leader to report to Super Admin
-- UPDATE users SET reports_to = 123 WHERE id = 456;

-- Set Counselors to report to Team Leader  
-- UPDATE users SET reports_to = 456 WHERE role = 'counselor';

-- STEP 3: Verify the hierarchy setup
SELECT 
    supervisor.name as supervisor,
    supervisor.role as supervisor_role,
    supervisor.username as supervisor_username,
    COUNT(subordinate.id) as team_size,
    STRING_AGG(subordinate.name || ' (' || subordinate.role || ')', ', ') as team_members
FROM users supervisor
LEFT JOIN users subordinate ON subordinate.reports_to = supervisor.id
GROUP BY supervisor.id, supervisor.name, supervisor.role, supervisor.username
HAVING COUNT(subordinate.id) > 0 OR supervisor.role IN ('super_admin', 'senior_manager', 'manager', 'team_leader')
ORDER BY 
    CASE supervisor.role 
        WHEN 'super_admin' THEN 1
        WHEN 'senior_manager' THEN 2
        WHEN 'manager' THEN 3
        WHEN 'team_leader' THEN 4
        ELSE 5
    END, supervisor.name;

-- STEP 4: Check that everyone has proper hierarchy
SELECT 
    'Users with supervisor' as status,
    COUNT(*) as count
FROM users 
WHERE reports_to IS NOT NULL AND role != 'super_admin'

UNION ALL

SELECT 
    'Users without supervisor (excluding super_admin)' as status,
    COUNT(*) as count
FROM users 
WHERE reports_to IS NULL AND role != 'super_admin'

UNION ALL

SELECT 
    'Super admins (should have no supervisor)' as status,
    COUNT(*) as count
FROM users 
WHERE role = 'super_admin';

-- STEP 5: Test the assignable users logic
-- This simulates what the API does for a team leader
WITH RECURSIVE subordinates_tree AS (
    -- Base case: direct reports
    SELECT id, name, username, role, reports_to, 1 as level
    FROM users 
    WHERE reports_to = (
        SELECT id FROM users 
        WHERE username = 'YOUR_TEAM_LEADER_USERNAME_HERE' -- CHANGE THIS
        LIMIT 1
    )
    
    UNION ALL
    
    -- Recursive case: reports of reports
    SELECT u.id, u.name, u.username, u.role, u.reports_to, st.level + 1
    FROM users u
    INNER JOIN subordinates_tree st ON u.reports_to = st.id
    WHERE st.level < 5 -- Prevent infinite recursion
)
SELECT 
    'Team Leader can assign to:' as description,
    COUNT(*) + 1 as total_assignable_users -- +1 for themselves
FROM subordinates_tree;

-- Show the actual users
WITH RECURSIVE subordinates_tree AS (
    SELECT id, name, username, role, reports_to, 1 as level
    FROM users 
    WHERE reports_to = (
        SELECT id FROM users 
        WHERE username = 'YOUR_TEAM_LEADER_USERNAME_HERE' -- CHANGE THIS
        LIMIT 1
    )
    
    UNION ALL
    
    SELECT u.id, u.name, u.username, u.role, u.reports_to, st.level + 1
    FROM users u
    INNER JOIN subordinates_tree st ON u.reports_to = st.id
    WHERE st.level < 5
)
SELECT 
    name,
    username, 
    role,
    level as reporting_level
FROM subordinates_tree
ORDER BY level, name;