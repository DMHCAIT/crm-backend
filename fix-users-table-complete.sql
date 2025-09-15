-- COMPLETE FIX FOR MISSING USERS TABLE COLUMNS
-- Run this in your Supabase SQL Editor to fix all user creation issues

-- 1. Add assigned_to column (for user assignment/hierarchy)
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS assigned_to uuid;

-- 2. Add permissions column (for role-based access control)  
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS permissions text DEFAULT '["read", "write"]';

-- 3. Add foreign key constraint for assigned_to
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'users_assigned_to_fkey'
    ) THEN
        ALTER TABLE public.users 
        ADD CONSTRAINT users_assigned_to_fkey 
        FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 4. Add index for performance on assigned_to queries
CREATE INDEX IF NOT EXISTS idx_users_assigned_to ON public.users(assigned_to);

-- 5. Add documentation comments
COMMENT ON COLUMN public.users.assigned_to IS 'References the user ID of who this user is assigned to (supervisor/manager)';
COMMENT ON COLUMN public.users.permissions IS 'JSON array of user permissions for role-based access control';

-- 6. Update existing users to have default permissions if NULL
UPDATE public.users 
SET permissions = '["read", "write"]' 
WHERE permissions IS NULL;

-- 7. Verify the fix worked - check if columns exist
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public' 
AND column_name IN ('assigned_to', 'permissions')
ORDER BY column_name;

-- 8. Show current users table structure
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
ORDER BY ordinal_position;