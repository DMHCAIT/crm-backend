-- Add branch column to users table
-- Run this SQL in your Supabase SQL Editor

-- 1. Add branch column to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS branch character varying;

-- 2. Add index for performance on branch queries
CREATE INDEX IF NOT EXISTS idx_users_branch ON public.users(branch);

-- 3. Add comment to document the branch field
COMMENT ON COLUMN public.users.branch IS 'Office branch location (Delhi, Hyderabad, Kashmir)';

-- 4. Update existing users with default branch (optional)
-- You can set a default branch for existing users
UPDATE public.users 
SET branch = 'Delhi' 
WHERE branch IS NULL;

-- 5. Verify the column was added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public' 
AND column_name = 'branch';

-- 6. Check current users table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
ORDER BY ordinal_position;