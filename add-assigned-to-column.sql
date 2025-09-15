-- Add missing columns to users table for CRM functionality
-- This script adds the missing columns that the backend expects

-- Add assigned_to column to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS assigned_to uuid;

-- Add permissions column to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS permissions text DEFAULT '["read", "write"]';

-- Add foreign key constraint to reference other users (for manager/supervisor relationships)
ALTER TABLE public.users 
ADD CONSTRAINT users_assigned_to_fkey 
FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON DELETE SET NULL;

-- Add index for better performance on assigned_to queries
CREATE INDEX IF NOT EXISTS idx_users_assigned_to ON public.users(assigned_to);

-- Add comments to document the purpose of these columns
COMMENT ON COLUMN public.users.assigned_to IS 'References the user ID of who this user is assigned to (supervisor/manager)';
COMMENT ON COLUMN public.users.permissions IS 'JSON array of user permissions for role-based access control';

-- Optional: Update existing users to have no assignment (NULL by default)
-- This is safe since we're adding the column as nullable
UPDATE public.users 
SET assigned_to = NULL 
WHERE assigned_to IS NOT NULL;

-- Verify the columns were added successfully
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public' 
AND column_name IN ('assigned_to', 'permissions')
ORDER BY column_name;