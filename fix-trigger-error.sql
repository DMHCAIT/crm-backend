-- Fix PostgreSQL trigger error: record "new" has no field "updatedAt"
-- This error occurs when the trigger function references a column with incorrect case

-- First, let's check the actual column names in the users table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if there are any triggers on the users table
SELECT 
    trigger_name, 
    event_manipulation, 
    action_statement,
    action_timing
FROM information_schema.triggers 
WHERE event_object_table = 'users'
AND trigger_schema = 'public';

-- Check the trigger function definition
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines 
WHERE routine_name LIKE '%update_updated_at%'
AND routine_schema = 'public';

-- Most likely fix: Update the trigger function to use correct column name
-- The column is probably named 'updated_at' not 'updatedAt'

-- Drop and recreate the trigger function with correct column name
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    -- Use the correct column name (snake_case, not camelCase)
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Recreate the trigger on users table
DROP TRIGGER IF EXISTS update_users_updated_at ON users;

CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Verify the trigger was created successfully
SELECT 
    trigger_name, 
    event_manipulation, 
    action_timing,
    event_object_table
FROM information_schema.triggers 
WHERE event_object_table = 'users'
AND trigger_schema = 'public';