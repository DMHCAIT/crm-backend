-- COMPREHENSIVE DATABASE SCHEMA FIX FOR CRM PRODUCTION
-- This script fixes all database schema issues found in production

-- 1. NOTES TABLE ALREADY EXISTS - Just add indexes for performance (if missing)
CREATE INDEX IF NOT EXISTS idx_notes_lead_id ON public.notes(lead_id);
CREATE INDEX IF NOT EXISTS idx_notes_student_id ON public.notes(student_id);
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON public.notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_author_id ON public.notes(author_id);
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON public.notes(created_at);

-- 2. ENSURE USERS TABLE HAS ALL REQUIRED COLUMNS
-- Add missing columns that the backend expects
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS assigned_to uuid,
ADD COLUMN IF NOT EXISTS permissions text DEFAULT '["read", "write"]';

-- 3. CREATE MISSING LEADS TABLE (if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.leads (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    full_name character varying NOT NULL,
    email character varying,
    phone character varying,
    country character varying,
    branch character varying,
    qualification character varying,
    source character varying DEFAULT 'website'::character varying,
    course character varying,
    status character varying DEFAULT 'new'::character varying,
    assigned_to uuid,
    follow_up timestamp with time zone,
    notes text[] DEFAULT '{}',
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT leads_pkey PRIMARY KEY (id),
    CONSTRAINT leads_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON DELETE SET NULL
);

-- Add indexes for leads
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON public.leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at);
CREATE INDEX IF NOT EXISTS idx_leads_email ON public.leads(email);

-- 4. CREATE MISSING STUDENTS TABLE (if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.students (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    full_name character varying NOT NULL,
    email character varying UNIQUE,
    phone character varying,
    course character varying,
    batch character varying,
    status character varying DEFAULT 'active'::character varying,
    enrollment_date timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT students_pkey PRIMARY KEY (id)
);

-- Add indexes for students
CREATE INDEX IF NOT EXISTS idx_students_status ON public.students(status);
CREATE INDEX IF NOT EXISTS idx_students_email ON public.students(email);
CREATE INDEX IF NOT EXISTS idx_students_created_at ON public.students(created_at);

-- 5. ADD FOREIGN KEY CONSTRAINTS (safely)
DO $$ 
BEGIN
    -- Add foreign key for users.assigned_to if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'users_assigned_to_fkey'
        AND table_name = 'users'
    ) THEN
        ALTER TABLE public.users 
        ADD CONSTRAINT users_assigned_to_fkey 
        FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON DELETE SET NULL;
    END IF;

    -- Add foreign key for notes.lead_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'notes_lead_id_fkey'
        AND table_name = 'notes'
    ) THEN
        ALTER TABLE public.notes 
        ADD CONSTRAINT notes_lead_id_fkey 
        FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;
    END IF;

    -- Add foreign key for notes.student_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'notes_student_id_fkey'
        AND table_name = 'notes'
    ) THEN
        ALTER TABLE public.notes 
        ADD CONSTRAINT notes_student_id_fkey 
        FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;
    END IF;

    -- Add foreign key for notes.user_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'notes_user_id_fkey'
        AND table_name = 'notes'
    ) THEN
        ALTER TABLE public.notes 
        ADD CONSTRAINT notes_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 6. UPDATE EXISTING USERS WITH DEFAULT PERMISSIONS IF NULL
UPDATE public.users 
SET permissions = '["read", "write"]' 
WHERE permissions IS NULL OR permissions = '';

-- 7. ADD HELPFUL COMMENTS
COMMENT ON TABLE public.notes IS 'Notes associated with leads, students, or general system notes';
COMMENT ON TABLE public.leads IS 'Lead management table for tracking potential customers';
COMMENT ON TABLE public.students IS 'Student enrollment and management table';
COMMENT ON COLUMN public.users.assigned_to IS 'User ID of the supervisor/manager this user reports to';
COMMENT ON COLUMN public.users.permissions IS 'JSON array of user permissions for access control';

-- 8. VERIFICATION QUERIES - Check if everything was created properly
SELECT 'TABLES CREATED:' as status;
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'leads', 'students', 'notes', 'user_profiles')
ORDER BY table_name;

SELECT 'USER TABLE COLUMNS:' as status;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
AND column_name IN ('username', 'assigned_to', 'permissions')
ORDER BY column_name;

SELECT 'FOREIGN KEY CONSTRAINTS:' as status;
SELECT constraint_name, table_name, constraint_type
FROM information_schema.table_constraints 
WHERE table_schema = 'public' 
AND constraint_type = 'FOREIGN KEY'
AND constraint_name LIKE '%users%' OR constraint_name LIKE '%notes%'
ORDER BY table_name, constraint_name;