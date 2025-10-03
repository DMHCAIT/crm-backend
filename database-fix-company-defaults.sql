-- FIX COMPANY DEFAULT VALUES
-- This script removes the DEFAULT 'DMHCA' constraints that were causing company differentiation issues
-- Run this if you already applied the previous schema files that had DEFAULT 'DMHCA'

-- Remove default constraints from company columns
DO $$ 
BEGIN
    -- Remove default from leads.company column
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' 
        AND column_name = 'company' 
        AND column_default IS NOT NULL
    ) THEN
        ALTER TABLE leads ALTER COLUMN company DROP DEFAULT;
        RAISE NOTICE 'Removed DEFAULT constraint from leads.company';
    END IF;
    
    -- Remove default from users.company column  
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'company' 
        AND column_default IS NOT NULL
    ) THEN
        ALTER TABLE users ALTER COLUMN company DROP DEFAULT;
        RAISE NOTICE 'Removed DEFAULT constraint from users.company';
    END IF;
END $$;

-- Show current column definitions to verify changes
SELECT 
    table_name,
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('leads', 'users') 
    AND column_name = 'company'
ORDER BY table_name;

-- Summary of records by company
SELECT 'LEADS' as table_name, 
    company, 
    COUNT(*) as count 
FROM leads 
GROUP BY company 
UNION ALL
SELECT 'USERS' as table_name, 
    company, 
    COUNT(*) as count 
FROM users 
GROUP BY company
ORDER BY table_name, company;