/**
 * DMHCA CRM Database SQL Schema
 * Complete database schema for all CRM tables
 * Execute this SQL in Supabase SQL Editor or via API
 */

-- =====================================================
-- 1. USERS TABLE - Core authentication and user management
-- =====================================================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  role VARCHAR(50) NOT NULL DEFAULT 'counselor',
  designation VARCHAR(100),
  department VARCHAR(100),
  location VARCHAR(100),
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  permissions TEXT[], -- Array of permissions
  last_login TIMESTAMPTZ,
  password_hash VARCHAR(255), -- For custom auth if needed
  avatar_url TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department);

-- Users table trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 2. LEADS TABLE - Lead management and tracking
-- =====================================================

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20) NOT NULL,
  course_interest VARCHAR(100),
  lead_source VARCHAR(50) NOT NULL DEFAULT 'manual',
  status VARCHAR(50) NOT NULL DEFAULT 'new',
  stage VARCHAR(50) NOT NULL DEFAULT 'inquiry',
  priority VARCHAR(20) NOT NULL DEFAULT 'medium',
  assigned_to UUID REFERENCES users(id),
  follow_up_date TIMESTAMPTZ,
  last_contact_date TIMESTAMPTZ,
  conversion_date TIMESTAMPTZ,
  notes TEXT,
  tags TEXT[],
  lead_score INTEGER DEFAULT 0,
  location VARCHAR(100),
  budget_range VARCHAR(50),
  preferred_timing VARCHAR(100),
  referral_source VARCHAR(100),
  utm_source VARCHAR(100),
  utm_medium VARCHAR(100),
  utm_campaign VARCHAR(100),
  contact_attempts INTEGER DEFAULT 0,
  is_qualified BOOLEAN DEFAULT FALSE,
  disqualified_reason TEXT,
  custom_fields JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leads table indexes
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_stage ON leads(stage);
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(lead_source);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);
CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);

-- Leads table trigger
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 3. STUDENTS TABLE - Enrolled student management
-- =====================================================

CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id VARCHAR(50) UNIQUE, -- Custom student ID
  lead_id UUID REFERENCES leads(id), -- Connection to original lead
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20) NOT NULL,
  course VARCHAR(100) NOT NULL,
  batch VARCHAR(50),
  enrollment_date DATE NOT NULL,
  course_start_date DATE,
  course_end_date DATE,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  payment_status VARCHAR(50) NOT NULL DEFAULT 'pending',
  fee_amount DECIMAL(10,2),
  fee_paid DECIMAL(10,2) DEFAULT 0,
  fee_pending DECIMAL(10,2),
  payment_method VARCHAR(50),
  guardian_name VARCHAR(255),
  guardian_phone VARCHAR(20),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  pincode VARCHAR(10),
  date_of_birth DATE,
  qualification VARCHAR(100),
  experience_years INTEGER DEFAULT 0,
  previous_company VARCHAR(100),
  emergency_contact VARCHAR(20),
  placement_status VARCHAR(50) DEFAULT 'not_placed',
  placement_company VARCHAR(100),
  placement_salary DECIMAL(10,2),
  placement_date DATE,
  documents_submitted BOOLEAN DEFAULT FALSE,
  kyc_verified BOOLEAN DEFAULT FALSE,
  notes TEXT,
  custom_fields JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Students table indexes
CREATE INDEX IF NOT EXISTS idx_students_student_id ON students(student_id);
CREATE INDEX IF NOT EXISTS idx_students_course ON students(course);
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);
CREATE INDEX IF NOT EXISTS idx_students_batch ON students(batch);
CREATE INDEX IF NOT EXISTS idx_students_enrollment_date ON students(enrollment_date);
CREATE INDEX IF NOT EXISTS idx_students_payment_status ON students(payment_status);
CREATE INDEX IF NOT EXISTS idx_students_phone ON students(phone);

-- Students table trigger
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 4. COMMUNICATIONS TABLE - All communication logs
-- =====================================================

CREATE TABLE IF NOT EXISTS communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id),
  student_id UUID REFERENCES students(id),
  user_id UUID REFERENCES users(id) NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'call', 'email', 'whatsapp', 'sms', 'meeting'
  direction VARCHAR(20) NOT NULL, -- 'inbound', 'outbound'
  status VARCHAR(50) NOT NULL, -- 'completed', 'missed', 'failed', 'scheduled'
  subject VARCHAR(255),
  content TEXT,
  duration_minutes INTEGER,
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  contact_method VARCHAR(100), -- phone number, email address, etc.
  platform VARCHAR(50), -- whatsapp, facebook, email, phone
  external_id VARCHAR(255), -- ID from external system
  metadata JSONB DEFAULT '{}',
  attachments TEXT[], -- Array of file URLs
  follow_up_required BOOLEAN DEFAULT FALSE,
  follow_up_date TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Communications table indexes
CREATE INDEX IF NOT EXISTS idx_communications_lead_id ON communications(lead_id);
CREATE INDEX IF NOT EXISTS idx_communications_student_id ON communications(student_id);
CREATE INDEX IF NOT EXISTS idx_communications_user_id ON communications(user_id);
CREATE INDEX IF NOT EXISTS idx_communications_type ON communications(type);
CREATE INDEX IF NOT EXISTS idx_communications_created_at ON communications(created_at);

-- Communications table trigger
CREATE TRIGGER update_communications_updated_at BEFORE UPDATE ON communications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 5. DOCUMENTS TABLE - Document management
-- =====================================================

CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id),
  student_id UUID REFERENCES students(id),
  user_id UUID REFERENCES users(id) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_type VARCHAR(50) NOT NULL, -- 'pdf', 'doc', 'image', etc.
  file_size INTEGER, -- in bytes
  category VARCHAR(100), -- 'admission', 'payment', 'certificate', etc.
  is_private BOOLEAN DEFAULT FALSE,
  access_level VARCHAR(50) DEFAULT 'user', -- 'public', 'user', 'admin'
  tags TEXT[],
  version INTEGER DEFAULT 1,
  original_filename VARCHAR(255),
  upload_source VARCHAR(50), -- 'manual', 'whatsapp', 'email', etc.
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Documents table indexes
CREATE INDEX IF NOT EXISTS idx_documents_lead_id ON documents(lead_id);
CREATE INDEX IF NOT EXISTS idx_documents_student_id ON documents(student_id);
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);
CREATE INDEX IF NOT EXISTS idx_documents_file_type ON documents(file_type);

-- Documents table trigger
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 6. PAYMENTS TABLE - Payment tracking
-- =====================================================

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) NOT NULL,
  lead_id UUID REFERENCES leads(id),
  user_id UUID REFERENCES users(id), -- User who recorded the payment
  payment_id VARCHAR(100) UNIQUE, -- External payment gateway ID
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'INR',
  payment_method VARCHAR(50) NOT NULL, -- 'cash', 'upi', 'card', 'cheque', 'bank_transfer'
  payment_gateway VARCHAR(50), -- 'razorpay', 'paytm', 'phonepe', etc.
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'refunded'
  transaction_ref VARCHAR(100), -- Bank transaction reference
  payment_date TIMESTAMPTZ NOT NULL,
  due_date TIMESTAMPTZ,
  description TEXT,
  receipt_url TEXT,
  refund_amount DECIMAL(10,2) DEFAULT 0,
  refund_date TIMESTAMPTZ,
  refund_reason TEXT,
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payments table indexes
CREATE INDEX IF NOT EXISTS idx_payments_student_id ON payments(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_id ON payments(payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);

-- Payments table trigger
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 7. ANALYTICS EVENTS TABLE - Track all user actions
-- =====================================================

CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  event_type VARCHAR(100) NOT NULL, -- 'lead_created', 'call_made', 'email_sent', etc.
  entity_type VARCHAR(50), -- 'lead', 'student', 'user', etc.
  entity_id UUID,
  event_data JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Analytics table indexes
CREATE INDEX IF NOT EXISTS idx_analytics_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON analytics_events(created_at);

-- =====================================================
-- 8. SYSTEM SETTINGS TABLE - Application configuration
-- =====================================================

CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) UNIQUE NOT NULL,
  value JSONB NOT NULL,
  category VARCHAR(50) DEFAULT 'general',
  description TEXT,
  is_public BOOLEAN DEFAULT FALSE, -- Whether setting is visible to non-admin users
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Settings table indexes
CREATE INDEX IF NOT EXISTS idx_settings_key ON system_settings(key);
CREATE INDEX IF NOT EXISTS idx_settings_category ON system_settings(category);

-- Settings table trigger
CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 9. INTEGRATION LOGS TABLE - Track external integrations
-- =====================================================

CREATE TABLE IF NOT EXISTS integration_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_type VARCHAR(50) NOT NULL, -- 'whatsapp', 'facebook', 'razorpay', etc.
  direction VARCHAR(20) NOT NULL, -- 'inbound', 'outbound'
  status VARCHAR(50) NOT NULL, -- 'success', 'failed', 'pending'
  endpoint VARCHAR(255),
  request_data JSONB,
  response_data JSONB,
  error_message TEXT,
  processing_time_ms INTEGER,
  retry_count INTEGER DEFAULT 0,
  lead_id UUID REFERENCES leads(id),
  student_id UUID REFERENCES students(id),
  external_id VARCHAR(255), -- ID from external system
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Integration logs indexes
CREATE INDEX IF NOT EXISTS idx_integration_logs_type ON integration_logs(integration_type);
CREATE INDEX IF NOT EXISTS idx_integration_logs_status ON integration_logs(status);
CREATE INDEX IF NOT EXISTS idx_integration_logs_created_at ON integration_logs(created_at);

-- =====================================================
-- 10. NOTIFICATIONS TABLE - System notifications
-- =====================================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'info', 'success', 'warning', 'error'
  category VARCHAR(50), -- 'lead', 'payment', 'system', etc.
  is_read BOOLEAN DEFAULT FALSE,
  action_url TEXT, -- URL to redirect when notification is clicked
  entity_type VARCHAR(50), -- 'lead', 'student', etc.
  entity_id UUID,
  metadata JSONB DEFAULT '{}',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- =====================================================
-- INSERT DEFAULT DATA
-- =====================================================

-- Insert default system settings
INSERT INTO system_settings (key, value, category, description, is_public) VALUES
('app_name', '{"text": "DMHCA CRM"}', 'general', 'Application name', true),
('app_version', '{"version": "2.1.0"}', 'general', 'Application version', true),
('lead_sources', '{"sources": ["Website", "WhatsApp", "Facebook", "Phone Call", "Walk-in", "Referral", "Google Ads", "Social Media"]}', 'leads', 'Available lead sources', false),
('lead_statuses', '{"statuses": ["new", "contacted", "qualified", "proposal", "negotiation", "closed_won", "closed_lost"]}', 'leads', 'Available lead statuses', false),
('user_roles', '{"roles": ["counselor", "team_leader", "manager", "senior_manager", "admin", "super_admin"]}', 'users', 'Available user roles', false),
('courses', '{"courses": ["Full Stack Development", "Digital Marketing", "Data Science", "UI/UX Design", "Mobile App Development", "Python Programming", "Java Development"]}', 'courses', 'Available courses', true)
ON CONFLICT (key) DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = NOW();

-- Insert default admin user (only if not exists)
INSERT INTO users (email, name, role, department, status, permissions)
VALUES ('admin@dmhca.in', 'DMHCA Admin', 'super_admin', 'Administration', 'active', ARRAY['*'])
ON CONFLICT (email) DO NOTHING;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '🎉 DMHCA CRM Database Schema Created Successfully!';
    RAISE NOTICE '✅ All tables, indexes, and triggers have been created';
    RAISE NOTICE '✅ Default settings and admin user have been inserted';
    RAISE NOTICE '📧 Default admin user: admin@dmhca.in';
    RAISE NOTICE '⚠️  Please set up authentication for the admin user';
END
$$;
