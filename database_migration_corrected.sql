-- 🚀 CORRECTED CRM DATABASE MIGRATION SCRIPT
-- This script handles the actual column names in your existing leads table
-- Run this script in your Supabase SQL Editor after running check_leads_columns.sql

-- ================================================================
-- STEP 1: ALTER EXISTING LEADS TABLE - ADD MISSING COLUMNS
-- ================================================================

-- Add missing columns to leads table
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS branch VARCHAR(100) DEFAULT 'Main Branch',
ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS experience VARCHAR(255),
ADD COLUMN IF NOT EXISTS location VARCHAR(255),
ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS communicationsCount INTEGER DEFAULT 0;

-- Add indexes for performance on new columns
CREATE INDEX IF NOT EXISTS idx_leads_branch ON leads(branch);
CREATE INDEX IF NOT EXISTS idx_leads_priority ON leads(priority);
CREATE INDEX IF NOT EXISTS idx_leads_score ON leads(score);
CREATE INDEX IF NOT EXISTS idx_leads_location ON leads(location);

-- Add field name standardization (backup fields for compatibility)
-- Only add these if they don't already exist
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS assigned_to VARCHAR(255),
ADD COLUMN IF NOT EXISTS assignedCounselor VARCHAR(255),
ADD COLUMN IF NOT EXISTS nextFollowUp TIMESTAMP,
ADD COLUMN IF NOT EXISTS next_follow_up TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255);

-- Update existing records to populate backup fields based on actual column names
-- Update assigned_to from assignedTo if it exists (with proper column quoting)
UPDATE leads 
SET assigned_to = "assignedTo" 
WHERE assigned_to IS NULL AND "assignedTo" IS NOT NULL;

-- Update assignedCounselor from assignedTo if it exists
UPDATE leads 
SET assignedCounselor = "assignedTo" 
WHERE assignedCounselor IS NULL AND "assignedTo" IS NOT NULL;

-- Update nextFollowUp from followUp if it exists (with type casting)
UPDATE leads 
SET nextFollowUp = "followUp"::timestamp 
WHERE nextFollowUp IS NULL AND "followUp" IS NOT NULL AND "followUp" != '';

-- Update next_follow_up from followUp if it exists (with type casting)
UPDATE leads 
SET next_follow_up = "followUp"::timestamp 
WHERE next_follow_up IS NULL AND "followUp" IS NOT NULL AND "followUp" != '';

-- ================================================================
-- STEP 2: CREATE LEAD NOTES TABLE (STRUCTURED NOTES)
-- ================================================================

CREATE TABLE IF NOT EXISTS lead_notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id UUID NOT NULL,
    content TEXT NOT NULL,
    author VARCHAR(255) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    note_type VARCHAR(50) DEFAULT 'general',
    is_private BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraint
    CONSTRAINT fk_lead_notes_lead_id 
        FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
);

-- Indexes for lead_notes
CREATE INDEX IF NOT EXISTS idx_lead_notes_lead_id ON lead_notes(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_notes_timestamp ON lead_notes(timestamp);
CREATE INDEX IF NOT EXISTS idx_lead_notes_author ON lead_notes(author);
CREATE INDEX IF NOT EXISTS idx_lead_notes_type ON lead_notes(note_type);

-- ================================================================
-- STEP 3: CREATE LEAD ACTIVITIES TABLE (AUDIT TRAIL)
-- ================================================================

CREATE TABLE IF NOT EXISTS lead_activities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id UUID NOT NULL,
    activity_type VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    old_value VARCHAR(500),
    new_value VARCHAR(500),
    performed_by VARCHAR(255) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraint
    CONSTRAINT fk_lead_activities_lead_id 
        FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
);

-- Indexes for lead_activities
CREATE INDEX IF NOT EXISTS idx_lead_activities_lead_id ON lead_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_activities_timestamp ON lead_activities(timestamp);
CREATE INDEX IF NOT EXISTS idx_lead_activities_type ON lead_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_lead_activities_performed_by ON lead_activities(performed_by);

-- ================================================================
-- STEP 4: CREATE SYSTEM CONFIGURATION TABLE
-- ================================================================

CREATE TABLE IF NOT EXISTS system_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    config_key VARCHAR(100) NOT NULL UNIQUE,
    config_value JSON NOT NULL,
    description TEXT,
    updated_by VARCHAR(255),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default configuration options
INSERT INTO system_config (config_key, config_value, description, updated_by) VALUES
('status_options', '["new", "contacted", "qualified", "proposal", "negotiation", "closed-won", "closed-lost", "hot", "warm", "follow_up", "not_interested", "enrolled", "fresh"]', 'Available lead status options', 'system')
ON CONFLICT (config_key) DO UPDATE SET 
    config_value = EXCLUDED.config_value,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO system_config (config_key, config_value, description, updated_by) VALUES
('priority_options', '["low", "medium", "high", "urgent"]', 'Available priority levels', 'system')
ON CONFLICT (config_key) DO UPDATE SET 
    config_value = EXCLUDED.config_value,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO system_config (config_key, config_value, description, updated_by) VALUES
('source_options', '["Website", "Social Media", "Referral", "Email Campaign", "Cold Call", "Event", "Partner", "Facebook", "WhatsApp", "Manual Entry", "LinkedIn", "Google Ads"]', 'Lead source options', 'system')
ON CONFLICT (config_key) DO UPDATE SET 
    config_value = EXCLUDED.config_value,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO system_config (config_key, config_value, description, updated_by) VALUES
('branch_options', '["Main Branch", "Delhi Branch", "Mumbai Branch", "Bangalore Branch", "Hyderabad Branch", "Chennai Branch", "Pune Branch", "Kolkata Branch", "Ahmedabad Branch", "Jaipur Branch"]', 'Available branch locations', 'system')
ON CONFLICT (config_key) DO UPDATE SET 
    config_value = EXCLUDED.config_value,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO system_config (config_key, config_value, description, updated_by) VALUES
('experience_options', '["0-1 years", "1-3 years", "3-5 years", "5-10 years", "10+ years", "Not Specified"]', 'Experience level options', 'system')
ON CONFLICT (config_key) DO UPDATE SET 
    config_value = EXCLUDED.config_value,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO system_config (config_key, config_value, description, updated_by) VALUES
('course_options', '{
  "fellowship": [
    "Aesthetic Medicine", "Anesthesia", "Cardiology", "Critical Care Medicine", 
    "Dermatology", "Emergency Medicine", "Endocrinology", "Family Medicine",
    "Gastroenterology", "General Surgery", "Geriatrics", "Hematology",
    "Infectious Diseases", "Internal Medicine", "Nephrology", "Neurology",
    "Obstetrics and Gynecology", "Oncology", "Ophthalmology", "Orthopedics",
    "Otolaryngology", "Pathology", "Pediatrics", "Plastic Surgery",
    "Psychiatry", "Pulmonology", "Radiology", "Rheumatology", "Urology"
  ],
  "pgDiploma": [
    "Clinical Research", "Hospital Administration", "Medical Education",
    "Public Health", "Epidemiology", "Medical Ethics", "Healthcare Quality"
  ]
}', 'Available courses by category', 'system')
ON CONFLICT (config_key) DO UPDATE SET 
    config_value = EXCLUDED.config_value,
    updated_at = CURRENT_TIMESTAMP;

-- ================================================================
-- STEP 5: CREATE ENHANCED COMMUNICATIONS TABLE
-- ================================================================

CREATE TABLE IF NOT EXISTS lead_communications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id UUID NOT NULL,
    type VARCHAR(50) NOT NULL, -- email, whatsapp, phone, sms, meeting
    direction VARCHAR(20) NOT NULL, -- inbound, outbound
    subject VARCHAR(500),
    content TEXT,
    sender VARCHAR(255),
    recipient VARCHAR(255),
    status VARCHAR(50) DEFAULT 'sent', -- sent, delivered, read, failed
    channel_id VARCHAR(255), -- External ID from WhatsApp, email service, etc.
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    delivered_at TIMESTAMP,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraint
    CONSTRAINT fk_lead_communications_lead_id 
        FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
);

-- Indexes for lead_communications
CREATE INDEX IF NOT EXISTS idx_communications_lead_id ON lead_communications(lead_id);
CREATE INDEX IF NOT EXISTS idx_communications_timestamp ON lead_communications(timestamp);
CREATE INDEX IF NOT EXISTS idx_communications_type ON lead_communications(type);
CREATE INDEX IF NOT EXISTS idx_communications_direction ON lead_communications(direction);
CREATE INDEX IF NOT EXISTS idx_communications_status ON lead_communications(status);

-- ================================================================
-- STEP 6: CREATE FLEXIBLE TRIGGERS FOR AUTOMATIC ACTIVITY LOGGING
-- ================================================================

-- Function to log lead changes (handles different column name formats)
CREATE OR REPLACE FUNCTION log_lead_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Log status change
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO lead_activities (lead_id, activity_type, description, old_value, new_value, performed_by)
        VALUES (
            NEW.id,
            'status_change',
            'Status changed from ' || COALESCE(OLD.status, 'null') || ' to ' || NEW.status,
            OLD.status,
            NEW.status,
            COALESCE(NEW.updated_by, 'system')
        );
    END IF;
    
    -- Log assignment change (check both assignedTo and assigned_to columns)
    IF (OLD."assignedTo" IS DISTINCT FROM NEW."assignedTo") OR 
       (OLD.assigned_to IS DISTINCT FROM NEW.assigned_to) THEN
        INSERT INTO lead_activities (lead_id, activity_type, description, old_value, new_value, performed_by)
        VALUES (
            NEW.id,
            'assignment_change',
            'Assignment changed',
            COALESCE(OLD."assignedTo", OLD.assigned_to, 'Unassigned'),
            COALESCE(NEW."assignedTo", NEW.assigned_to, 'Unassigned'),
            COALESCE(NEW.updated_by, 'system')
        );
    END IF;
    
    -- Log priority change (if priority column exists)
    IF OLD.priority IS DISTINCT FROM NEW.priority THEN
        INSERT INTO lead_activities (lead_id, activity_type, description, old_value, new_value, performed_by)
        VALUES (
            NEW.id,
            'priority_change',
            'Priority changed from ' || COALESCE(OLD.priority, 'null') || ' to ' || NEW.priority,
            OLD.priority,
            NEW.priority,
            COALESCE(NEW.updated_by, 'system')
        );
    END IF;
    
    -- Update timestamps
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    IF NEW.updated_at IS NOT NULL THEN
        NEW.updated_at = CURRENT_TIMESTAMP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for lead changes
DROP TRIGGER IF EXISTS trigger_log_lead_changes ON leads;
CREATE TRIGGER trigger_log_lead_changes
    BEFORE UPDATE ON leads
    FOR EACH ROW
    EXECUTE FUNCTION log_lead_changes();

-- ================================================================
-- STEP 7: UPDATE COMMUNICATIONS COUNT FUNCTION
-- ================================================================

-- Function to update communications count
CREATE OR REPLACE FUNCTION update_communications_count()
RETURNS TRIGGER AS $$
DECLARE
    lead_uuid UUID;
BEGIN
    -- Get the lead_id from either NEW or OLD record
    IF TG_OP = 'DELETE' THEN
        lead_uuid = OLD.lead_id;
    ELSE
        lead_uuid = NEW.lead_id;
    END IF;
    
    -- Update communications count for the lead
    UPDATE leads 
    SET communicationsCount = (
        SELECT COUNT(*) 
        FROM lead_communications 
        WHERE lead_id = lead_uuid
    )
    WHERE id = lead_uuid;
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for communications count
DROP TRIGGER IF EXISTS trigger_update_communications_count ON lead_communications;
CREATE TRIGGER trigger_update_communications_count
    AFTER INSERT OR UPDATE OR DELETE ON lead_communications
    FOR EACH ROW
    EXECUTE FUNCTION update_communications_count();

-- ================================================================
-- STEP 8: CREATE USEFUL VIEWS FOR REPORTING
-- ================================================================

-- View for lead summary with all related data
CREATE OR REPLACE VIEW lead_summary AS
SELECT 
    l.*,
    -- Count related records
    COALESCE(notes_count.count, 0) as notes_count,
    COALESCE(activities_count.count, 0) as activities_count,
    -- Latest activity
    latest_activity.description as latest_activity,
    latest_activity.timestamp as latest_activity_time,
    -- Latest note
    latest_note.content as latest_note,
    latest_note.timestamp as latest_note_time
FROM leads l
LEFT JOIN (
    SELECT lead_id, COUNT(*) as count 
    FROM lead_notes 
    GROUP BY lead_id
) notes_count ON l.id = notes_count.lead_id
LEFT JOIN (
    SELECT lead_id, COUNT(*) as count 
    FROM lead_activities 
    GROUP BY lead_id
) activities_count ON l.id = activities_count.lead_id
LEFT JOIN (
    SELECT DISTINCT ON (lead_id) lead_id, description, timestamp
    FROM lead_activities 
    ORDER BY lead_id, timestamp DESC
) latest_activity ON l.id = latest_activity.lead_id
LEFT JOIN (
    SELECT DISTINCT ON (lead_id) lead_id, content, timestamp
    FROM lead_notes 
    ORDER BY lead_id, timestamp DESC
) latest_note ON l.id = latest_note.lead_id;

-- ================================================================
-- STEP 9: DATA MIGRATION FOR EXISTING RECORDS (SAFE)
-- ================================================================

-- Migrate existing notes to structured format (only if notes column exists and has data)
DO $$
BEGIN
    -- Check if notes column exists before trying to migrate
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leads' AND column_name='notes') THEN
        INSERT INTO lead_notes (lead_id, content, author, note_type)
        SELECT 
            id as lead_id,
            notes as content,
            'System' as author,  -- Use static value since createdBy column doesn't exist
            'general' as note_type
        FROM leads 
        WHERE notes IS NOT NULL 
          AND notes != '' 
          AND LENGTH(trim(notes)) > 0
          AND NOT EXISTS (
              SELECT 1 FROM lead_notes WHERE lead_id = leads.id
          );
    END IF;
END $$;

-- Create initial activity records for existing leads
INSERT INTO lead_activities (lead_id, activity_type, description, performed_by)
SELECT 
    id as lead_id,
    'lead_created' as activity_type,
    'Lead imported to system' as description,
    'System' as performed_by  -- Use static value since createdBy column doesn't exist
FROM leads 
WHERE NOT EXISTS (
    SELECT 1 FROM lead_activities WHERE lead_id = leads.id
);

-- Update communications count for existing leads (set to 0 if no communications exist)
UPDATE leads 
SET communicationsCount = (
    SELECT COUNT(*) 
    FROM lead_communications 
    WHERE lead_id = leads.id
)
WHERE communicationsCount IS NULL;

-- ================================================================
-- VERIFICATION QUERIES
-- ================================================================

-- Check if all tables were created successfully
SELECT 
    'leads' as table_name,
    COUNT(*) as record_count
FROM leads
UNION ALL
SELECT 
    'lead_notes' as table_name,
    COUNT(*) as record_count
FROM lead_notes
UNION ALL
SELECT 
    'lead_activities' as table_name,
    COUNT(*) as record_count
FROM lead_activities
UNION ALL
SELECT 
    'system_config' as table_name,
    COUNT(*) as record_count
FROM system_config
UNION ALL
SELECT 
    'lead_communications' as table_name,
    COUNT(*) as record_count
FROM lead_communications;

-- Check new columns in leads table
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'leads' 
  AND column_name IN ('branch', 'priority', 'experience', 'location', 'score', 'communicationsCount')
ORDER BY column_name;

-- ================================================================
-- SUCCESS MESSAGE
-- ================================================================

SELECT 'Corrected database migration completed successfully! 🚀' as status;