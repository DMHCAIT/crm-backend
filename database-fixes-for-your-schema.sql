-- ============================================
-- REQUIRED DATABASE CHANGES FOR YOUR SCHEMA
-- Based on your existing database structure
-- ============================================

-- STEP 1: Add company field to leads table (CRITICAL)
ALTER TABLE leads ADD COLUMN company TEXT DEFAULT 'DMHCA';

-- STEP 2: Add company field to users table (CRITICAL)  
ALTER TABLE users ADD COLUMN company TEXT DEFAULT 'DMHCA';

-- STEP 3: Update existing records to have company field
UPDATE leads SET company = 'DMHCA' WHERE company IS NULL;
UPDATE users SET company = 'DMHCA' WHERE company IS NULL;

-- STEP 4: Create performance indexes
CREATE INDEX idx_leads_company ON leads(company);
CREATE INDEX idx_users_company ON users(company);
CREATE INDEX IF NOT EXISTS idx_users_reports_to ON users(reports_to);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_assignedTo ON leads(assignedTo);
CREATE INDEX IF NOT EXISTS idx_leads_assignedcounselor ON leads(assignedcounselor);

-- STEP 5: Add constraints (optional but recommended)
ALTER TABLE leads ADD CONSTRAINT chk_leads_company CHECK (company IN ('DMHCA', 'IBMP'));
ALTER TABLE users ADD CONSTRAINT chk_users_company CHECK (company IN ('DMHCA', 'IBMP'));

-- STEP 6: Verify the changes
SELECT 
    'leads' as table_name,
    COUNT(*) as total_records,
    COUNT(company) as records_with_company,
    company as company_value,
    COUNT(*) as count_per_company
FROM leads 
GROUP BY company
UNION ALL
SELECT 
    'users' as table_name,
    COUNT(*) as total_records,
    COUNT(company) as records_with_company,
    company as company_value,
    COUNT(*) as count_per_company
FROM users 
GROUP BY company;