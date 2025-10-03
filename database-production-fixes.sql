-- CRITICAL DATABASE FIXES FOR EXISTING SCHEMA
-- This script addresses the DEFAULT 'DMHCA' issues in your current database

-- 1. REMOVE DEFAULT CONSTRAINTS FROM COMPANY FIELDS
-- =================================================

-- Remove default from leads.company column
ALTER TABLE public.leads ALTER COLUMN company DROP DEFAULT;

-- Remove default from users.company column  
ALTER TABLE public.users ALTER COLUMN company DROP DEFAULT;

-- 2. MAKE COMPANY FIELDS NULLABLE (ALLOW EMPTY/NULL VALUES)
-- ========================================================

-- Ensure company fields can be NULL (no forced values)
ALTER TABLE public.leads ALTER COLUMN company DROP NOT NULL;
ALTER TABLE public.users ALTER COLUMN company DROP NOT NULL;

-- 3. ADD MISSING INDEXES FOR PERFORMANCE
-- =====================================

-- Add indexes for company filtering (if not already exist)
CREATE INDEX IF NOT EXISTS idx_leads_company ON public.leads(company);
CREATE INDEX IF NOT EXISTS idx_users_company ON public.users(company);

-- 4. ADD CHECK CONSTRAINTS FOR VALID COMPANY VALUES
-- ================================================

-- Add constraint to ensure only valid company values (or NULL)
DO $$ 
BEGIN
    -- Add constraint for leads table
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_leads_company') THEN
        ALTER TABLE public.leads ADD CONSTRAINT chk_leads_company 
        CHECK (company IS NULL OR company IN ('DMHCA', 'IBMP'));
        RAISE NOTICE 'Added company constraint to leads table';
    END IF;
    
    -- Add constraint for users table
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_users_company') THEN
        ALTER TABLE public.users ADD CONSTRAINT chk_users_company 
        CHECK (company IS NULL OR company IN ('DMHCA', 'IBMP'));
        RAISE NOTICE 'Added company constraint to users table';
    END IF;
END $$;

-- 5. OPTIONAL: CLEAN UP EXISTING DATA
-- ==================================

-- Update any existing NULL values to empty string if you prefer
-- (Uncomment these lines if you want to convert NULL to empty string)
-- UPDATE public.leads SET company = '' WHERE company IS NULL;
-- UPDATE public.users SET company = '' WHERE company IS NULL;

-- 6. VERIFY THE CHANGES
-- ====================

-- Show current column definitions
SELECT 
    table_name,
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('leads', 'users') 
    AND column_name = 'company'
    AND table_schema = 'public'
ORDER BY table_name;

-- Show company distribution in your data
SELECT 'LEADS' as table_name, 
    COALESCE(company, 'NULL/EMPTY') as company_value, 
    COUNT(*) as count 
FROM public.leads 
GROUP BY company 
UNION ALL
SELECT 'USERS' as table_name, 
    COALESCE(company, 'NULL/EMPTY') as company_value, 
    COUNT(*) as count 
FROM public.users 
GROUP BY company
ORDER BY table_name, company_value;

-- 7. ADDITIONAL RECOMMENDED FIXES
-- ===============================

-- Add missing hierarchy support fields if not present
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS reports_to uuid;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS branch character varying;

-- Add foreign key constraint for reports_to if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'users_reports_to_fkey'
    ) THEN
        ALTER TABLE public.users 
        ADD CONSTRAINT users_reports_to_fkey 
        FOREIGN KEY (reports_to) REFERENCES public.users(id);
        RAISE NOTICE 'Added reports_to foreign key constraint';
    END IF;
END $$;

-- Create indexes for hierarchy queries
CREATE INDEX IF NOT EXISTS idx_users_reports_to ON public.users(reports_to);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_branch ON public.users(branch);

-- Add created_at and updated_at triggers for automatic timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to leads table
DROP TRIGGER IF EXISTS update_leads_updated_at ON public.leads;
CREATE TRIGGER update_leads_updated_at
    BEFORE UPDATE ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to users table  
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMIT;

-- Final verification message
DO $$
BEGIN
    RAISE NOTICE '✅ Database fixes completed successfully!';
    RAISE NOTICE '📋 Key changes made:';
    RAISE NOTICE '   • Removed DEFAULT DMHCA constraints';
    RAISE NOTICE '   • Added proper company validation';
    RAISE NOTICE '   • Enhanced hierarchy support';
    RAISE NOTICE '   • Added performance indexes';
    RAISE NOTICE '   • Added automatic timestamp triggers';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 Your CRM should now properly differentiate between DMHCA and IBMP!';
END $$;