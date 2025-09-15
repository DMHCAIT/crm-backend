-- CRITICAL FIX: Database trigger error - record "new" has no field "updatedAt"
-- This happens when triggers use camelCase column names but the actual columns are snake_case

-- Step 1: Check if there are any problematic triggers
SELECT 
    trigger_name, 
    event_object_table,
    action_statement
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
AND (
    action_statement LIKE '%updatedAt%' OR 
    action_statement LIKE '%createdAt%' OR
    action_statement LIKE '%NEW."updatedAt"%' OR
    action_statement LIKE '%NEW."createdAt"%'
);

-- Step 2: Drop all problematic trigger functions that use camelCase
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS update_created_at_column() CASCADE;
DROP FUNCTION IF EXISTS update_updatedAt_column() CASCADE;
DROP FUNCTION IF EXISTS update_createdAt_column() CASCADE;

-- Step 3: Create correct trigger function for updated_at (snake_case)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    -- Use snake_case column name
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Apply the correct trigger to all relevant tables
-- Note: Only apply to tables that actually have updated_at column

-- Check which tables have updated_at column
SELECT table_name 
FROM information_schema.columns 
WHERE column_name = 'updated_at' 
AND table_schema = 'public';

-- Apply trigger to users table if it has updated_at column
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'updated_at' 
        AND table_schema = 'public'
    ) THEN
        DROP TRIGGER IF EXISTS update_users_updated_at ON users;
        CREATE TRIGGER update_users_updated_at 
            BEFORE UPDATE ON users 
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Apply trigger to leads table if it has updated_at column  
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' 
        AND column_name = 'updated_at' 
        AND table_schema = 'public'
    ) THEN
        DROP TRIGGER IF EXISTS update_leads_updated_at ON leads;
        CREATE TRIGGER update_leads_updated_at 
            BEFORE UPDATE ON leads 
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Apply trigger to notes table if it has updated_at column
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notes' 
        AND column_name = 'updated_at' 
        AND table_schema = 'public'
    ) THEN
        DROP TRIGGER IF EXISTS update_notes_updated_at ON notes;
        DROP TRIGGER IF EXISTS trigger_update_notes_updated_at ON notes;
        CREATE TRIGGER update_notes_updated_at 
            BEFORE UPDATE ON notes 
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Step 5: Verify all triggers are working correctly
SELECT 
    t.trigger_name,
    t.event_object_table as table_name,
    t.action_timing,
    t.event_manipulation
FROM information_schema.triggers t
WHERE t.trigger_schema = 'public'
AND t.trigger_name LIKE '%updated_at%'
ORDER BY t.event_object_table, t.trigger_name;

-- Step 6: Test the fix by attempting a simple update
-- This should not cause any errors now
DO $$
DECLARE
    test_user_id uuid;
BEGIN
    -- Get a user ID to test with
    SELECT id INTO test_user_id 
    FROM users 
    LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        -- Try a harmless update to trigger the updated_at
        UPDATE users 
        SET name = name -- This doesn't change anything but triggers the updated_at
        WHERE id = test_user_id;
        
        RAISE NOTICE 'SUCCESS: Trigger test completed without errors for user %', test_user_id;
    ELSE
        RAISE NOTICE 'No users found to test trigger with';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'ERROR during trigger test: %', SQLERRM;
END $$;