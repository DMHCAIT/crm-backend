-- ============================================
-- CRM CRITICAL DATABASE UPDATES (MINIMAL)
-- Only Essential Fields for Company & Hierarchy
-- ============================================

-- CRITICAL: Add company field to both tables
ALTER TABLE leads ADD COLUMN IF NOT EXISTS company TEXT DEFAULT 'DMHCA';
ALTER TABLE users ADD COLUMN IF NOT EXISTS company TEXT DEFAULT 'DMHCA';

-- Update existing records to have company field
UPDATE leads SET company = 'DMHCA' WHERE company IS NULL;
UPDATE users SET company = 'DMHCA' WHERE company IS NULL;

-- CRITICAL: Ensure hierarchy field exists (likely already exists)
ALTER TABLE users ADD COLUMN IF NOT EXISTS reports_to TEXT;

-- CRITICAL: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_leads_company ON leads(company);
CREATE INDEX IF NOT EXISTS idx_users_company ON users(company);
CREATE INDEX IF NOT EXISTS idx_users_reports_to ON users(reports_to);

-- VERIFY: Check if critical fields are now present
SELECT 
    'leads' as table_name,
    COUNT(*) as total_records,
    COUNT(company) as records_with_company
FROM leads
UNION ALL
SELECT 
    'users' as table_name,
    COUNT(*) as total_records,
    COUNT(company) as records_with_company
FROM users;