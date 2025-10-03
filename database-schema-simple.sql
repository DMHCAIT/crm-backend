-- ============================================
-- CRM DATABASE SCHEMA UPDATES (SIMPLIFIED)
-- Add Company Fields and Hierarchy Support
-- ============================================

-- STEP 1: ADD COMPANY FIELD TO LEADS TABLE
-- =========================================
ALTER TABLE leads ADD COLUMN IF NOT EXISTS company TEXT DEFAULT 'DMHCA';
CREATE INDEX IF NOT EXISTS idx_leads_company ON leads(company);
UPDATE leads SET company = 'DMHCA' WHERE company IS NULL;

-- STEP 2: ADD COMPANY FIELD TO USERS TABLE  
-- =========================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS company TEXT DEFAULT 'DMHCA';
CREATE INDEX IF NOT EXISTS idx_users_company ON users(company);
UPDATE users SET company = 'DMHCA' WHERE company IS NULL;

-- STEP 3: ENSURE HIERARCHY FIELDS IN USERS TABLE
-- ===============================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS reports_to TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS branch TEXT;
CREATE INDEX IF NOT EXISTS idx_users_reports_to ON users(reports_to);
CREATE INDEX IF NOT EXISTS idx_users_branch ON users(branch);

-- STEP 4: ENSURE CRITICAL LEAD FIELDS EXIST
-- ==========================================
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

-- STEP 5: CREATE PERFORMANCE INDEXES
-- ===================================
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_assignedTo ON leads(assignedTo);
CREATE INDEX IF NOT EXISTS idx_leads_assignedcounselor ON leads(assignedcounselor);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);
CREATE INDEX IF NOT EXISTS idx_leads_updated_at ON leads(updated_at);

-- STEP 6: VERIFY SCHEMA UPDATES
-- ==============================
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