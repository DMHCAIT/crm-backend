-- ==-- 1. ADD COMPANY FIELD TO LEADS TABLE
-- ===================================
ALTER TABLE leads ADD COLUMN IF NOT EXISTS company TEXT;
CREATE INDEX IF NOT EXISTS idx_leads_company ON leads(company);
-- Note: No default value for leads - company should be explicitly set=====================================
-- CRM DATABASE SCHEMA UPDATES
-- Add Company Fields and Hierarchy Support
-- ============================================

-- 1. ADD COMPANY FIELD TO LEADS TABLE
-- ====================================
ALTER TABLE leads ADD COLUMN IF NOT EXISTS company TEXT DEFAULT 'DMHCA';
CREATE INDEX IF NOT EXISTS idx_leads_company ON leads(company);
UPDATE leads SET company = 'DMHCA' WHERE company IS NULL;

-- Add constraint (drop first if exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_leads_company') THEN
        ALTER TABLE leads ADD CONSTRAINT chk_leads_company CHECK (company IN ('DMHCA', 'IBMP'));
    END IF;
END $$;

-- 2. ADD COMPANY FIELD TO USERS TABLE  
-- ====================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS company TEXT;
CREATE INDEX IF NOT EXISTS idx_users_company ON users(company);
-- Note: No default value for users - company should be explicitly set

-- Add constraint (drop first if exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_users_company') THEN
        ALTER TABLE users ADD CONSTRAINT chk_users_company CHECK (company IN ('DMHCA', 'IBMP'));
    END IF;
END $$;

-- 3. ENSURE HIERARCHY FIELDS IN USERS TABLE
-- ==========================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS reports_to TEXT REFERENCES users(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS branch TEXT;
CREATE INDEX IF NOT EXISTS idx_users_reports_to ON users(reports_to);
CREATE INDEX IF NOT EXISTS idx_users_branch ON users(branch);

-- 4. ENSURE ALL LEAD FIELDS EXIST
-- ================================
ALTER TABLE leads ADD COLUMN IF NOT EXISTS fullName TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'India';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS branch TEXT DEFAULT 'Main Branch';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS qualification TEXT DEFAULT '';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'Manual Entry';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS course TEXT DEFAULT 'Fellowship in Emergency Medicine';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Fresh';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS assigned_to TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS assignedTo TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS assignedcounselor TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '[]';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS experience TEXT DEFAULT 'Not specified';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS location TEXT DEFAULT 'Not specified';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 0;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS followUp TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS nextfollowup TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS next_follow_up TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE leads ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE leads ADD COLUMN IF NOT EXISTS updated_by TEXT;

-- 5. CREATE PERFORMANCE INDEXES
-- ==============================
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_assignedTo ON leads(assignedTo);
CREATE INDEX IF NOT EXISTS idx_leads_assignedcounselor ON leads(assignedcounselor);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);
CREATE INDEX IF NOT EXISTS idx_leads_updated_at ON leads(updated_at);

-- 6. VERIFY SCHEMA UPDATES
-- =========================
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name IN ('leads', 'users') 
    AND column_name IN ('company', 'reports_to', 'branch')
ORDER BY table_name, column_name;

-- Show company field status
SELECT 
    'leads' as table_name,
    COUNT(*) as total_records,
    COUNT(company) as records_with_company,
    COUNT(*) - COUNT(company) as records_missing_company
FROM leads
UNION ALL
SELECT 
    'users' as table_name,
    COUNT(*) as total_records,
    COUNT(company) as records_with_company,
    COUNT(*) - COUNT(company) as records_missing_company
FROM users;