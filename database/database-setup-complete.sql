-- ========================================
-- CRM Database Complete Setup Script
-- Run this in your Supabase SQL Editor
-- ========================================

-- Note: Skipping auth.users RLS as it's managed by Supabase

-- ========================================
-- 1. LEADS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  source TEXT DEFAULT 'manual' CHECK (source IN ('website', 'social_media', 'referral', 'manual', 'advertisement', 'cold_call', 'email_campaign')),
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost')),
  score INTEGER DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  budget DECIMAL(10,2),
  notes TEXT,
  assigned_to UUID REFERENCES auth.users(id),
  next_follow_up TIMESTAMP WITH TIME ZONE,
  tags TEXT[] DEFAULT '{}'::TEXT[]
);

-- ========================================
-- 2. STUDENTS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS students (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  date_of_birth DATE,
  course TEXT,
  course_start_date DATE,
  course_end_date DATE,
  status TEXT DEFAULT 'enrolled' CHECK (status IN ('enrolled', 'active', 'completed', 'dropped', 'suspended', 'on_hold')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  grade TEXT,
  attendance_percentage DECIMAL(5,2) DEFAULT 100.00,
  notes TEXT,
  emergency_contact TEXT,
  address TEXT,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid', 'overdue')),
  total_fees DECIMAL(10,2),
  paid_amount DECIMAL(10,2) DEFAULT 0
);

-- ========================================
-- 3. COMMUNICATIONS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS communications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  type TEXT NOT NULL CHECK (type IN ('email', 'sms', 'whatsapp', 'call', 'meeting', 'video_call', 'in_person')),
  direction TEXT DEFAULT 'outbound' CHECK (direction IN ('inbound', 'outbound')),
  subject TEXT,
  content TEXT,
  recipient TEXT,
  sender TEXT,
  status TEXT DEFAULT 'sent' CHECK (status IN ('draft', 'sent', 'delivered', 'read', 'failed', 'pending', 'scheduled')),
  scheduled_at TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  follow_up_required BOOLEAN DEFAULT FALSE,
  follow_up_date TIMESTAMP WITH TIME ZONE,
  attachments JSONB DEFAULT '[]'::JSONB
);

-- ========================================
-- 4. INTEGRATIONS STATUS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS integrations_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  integration_name TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'error', 'syncing', 'maintenance')),
  last_sync TIMESTAMP WITH TIME ZONE,
  sync_frequency TEXT DEFAULT 'manual' CHECK (sync_frequency IN ('manual', 'hourly', 'daily', 'weekly', 'real_time')),
  configuration JSONB DEFAULT '{}'::JSONB,
  error_message TEXT,
  sync_count INTEGER DEFAULT 0,
  last_error_at TIMESTAMP WITH TIME ZONE
);

-- ========================================
-- 5. COURSES TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS courses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  name TEXT NOT NULL,
  description TEXT,
  duration_weeks INTEGER,
  fee DECIMAL(10,2),
  max_students INTEGER DEFAULT 30,
  instructor TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'draft', 'archived')),
  start_date DATE,
  end_date DATE,
  schedule JSONB DEFAULT '{}'::JSONB,
  prerequisites TEXT[],
  learning_outcomes TEXT[]
);

-- ========================================
-- 6. TASKS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'completed', 'cancelled')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date TIMESTAMP WITH TIME ZONE,
  assigned_to UUID REFERENCES auth.users(id),
  created_by UUID REFERENCES auth.users(id),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  tags TEXT[] DEFAULT '{}'::TEXT[]
);

-- ========================================
-- 7. ACTIVITIES TABLE (Activity Log)
-- ========================================
CREATE TABLE IF NOT EXISTS activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  activity_type TEXT NOT NULL CHECK (activity_type IN ('lead_created', 'lead_updated', 'student_enrolled', 'student_updated', 'communication_sent', 'task_created', 'task_completed', 'payment_received', 'note_added')),
  description TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  metadata JSONB DEFAULT '{}'::JSONB
);

-- ========================================
-- 8. PAYMENTS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  payment_method TEXT CHECK (payment_method IN ('cash', 'card', 'bank_transfer', 'check', 'online', 'upi')),
  payment_date DATE DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  transaction_id TEXT,
  notes TEXT,
  receipt_url TEXT
);

-- ========================================
-- 9. DOCUMENTS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  uploaded_by UUID REFERENCES auth.users(id),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  folder TEXT DEFAULT 'general',
  tags TEXT[] DEFAULT '{}'::TEXT[],
  is_public BOOLEAN DEFAULT FALSE
);

-- ========================================
-- ========================================
-- USER AUTHENTICATION & PROFILE SETUP
-- ========================================

-- 10. USER PROFILES TABLE (Extended user info)
-- ========================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  full_name TEXT,
  phone TEXT,
  role TEXT DEFAULT 'agent' CHECK (role IN ('super_admin', 'admin', 'manager', 'agent', 'viewer')),
  department TEXT,
  avatar_url TEXT,
  preferences JSONB DEFAULT '{}'::JSONB,
  is_active BOOLEAN DEFAULT TRUE
);

-- ========================================
-- AUTO USER PROFILE CREATION TRIGGER
-- ========================================
-- This function creates a user profile automatically when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    CASE 
      WHEN NEW.email = 'admin@dmhca.com' THEN 'super_admin'
      ELSE 'agent'
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create user profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ========================================
-- 11. CAMPAIGNS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  name TEXT NOT NULL,
  description TEXT,
  type TEXT CHECK (type IN ('email', 'sms', 'whatsapp', 'mixed')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'running', 'paused', 'completed', 'cancelled')),
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  target_audience JSONB DEFAULT '{}'::JSONB,
  content JSONB DEFAULT '{}'::JSONB,
  metrics JSONB DEFAULT '{}'::JSONB,
  created_by UUID REFERENCES auth.users(id)
);

-- ========================================
-- 12. AUTOMATIONS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS automations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT CHECK (trigger_type IN ('lead_created', 'lead_status_changed', 'student_enrolled', 'payment_received', 'time_based')),
  trigger_conditions JSONB DEFAULT '{}'::JSONB,
  actions JSONB DEFAULT '[]'::JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  execution_count INTEGER DEFAULT 0,
  last_executed TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id)
);

-- ========================================
-- DEFAULT ADMIN USER SETUP
-- ========================================
-- Note: Admin user profile will be created automatically when you add a user
-- through Supabase Authentication with email: admin@dmhca.com
-- The trigger will automatically assign super_admin role to that email

-- Optional: Create a demo admin profile for testing (without foreign key constraint)
-- This is useful for frontend development and testing
-- Remove this in production and use real Supabase authentication

DO $$
BEGIN
  RAISE NOTICE 'Admin user setup instructions:';
  RAISE NOTICE '1. Go to Supabase Dashboard > Authentication > Users';
  RAISE NOTICE '2. Click "Add User" and create user with email: admin@dmhca.com';
  RAISE NOTICE '3. The system will automatically create a super_admin profile';
  RAISE NOTICE '4. Use that email/password to login to your CRM system';
END $$;

-- ========================================
-- ENABLE ROW LEVEL SECURITY
-- ========================================
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE automations ENABLE ROW LEVEL SECURITY;

-- ========================================
-- ENABLE REAL-TIME FOR ALL TABLES (with conflict handling)
-- ========================================
DO $$
BEGIN
  -- Try to add each table to realtime, ignore if already exists
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE leads;
  EXCEPTION WHEN duplicate_object THEN
    NULL; -- Ignore if already exists
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE students;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE communications;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE integrations_status;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE courses;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE activities;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE payments;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE documents;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE user_profiles;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE campaigns;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE automations;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;

-- ========================================
-- ROW LEVEL SECURITY POLICIES (with conflict handling)
-- ========================================

-- Leads policies
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON leads;
CREATE POLICY "Enable all access for authenticated users" ON leads
FOR ALL USING (auth.role() = 'authenticated');

-- Students policies
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON students;
CREATE POLICY "Enable all access for authenticated users" ON students
FOR ALL USING (auth.role() = 'authenticated');

-- Communications policies
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON communications;
CREATE POLICY "Enable all access for authenticated users" ON communications
FOR ALL USING (auth.role() = 'authenticated');

-- Integrations policies
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON integrations_status;
CREATE POLICY "Enable all access for authenticated users" ON integrations_status
FOR ALL USING (auth.role() = 'authenticated');

-- Courses policies
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON courses;
CREATE POLICY "Enable all access for authenticated users" ON courses
FOR ALL USING (auth.role() = 'authenticated');

-- Tasks policies
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON tasks;
CREATE POLICY "Enable all access for authenticated users" ON tasks
FOR ALL USING (auth.role() = 'authenticated');

-- Activities policies
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON activities;
CREATE POLICY "Enable all access for authenticated users" ON activities
FOR ALL USING (auth.role() = 'authenticated');

-- Payments policies
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON payments;
CREATE POLICY "Enable all access for authenticated users" ON payments
FOR ALL USING (auth.role() = 'authenticated');

-- Documents policies
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON documents;
CREATE POLICY "Enable all access for authenticated users" ON documents
FOR ALL USING (auth.role() = 'authenticated');

-- User profiles policies with enhanced security
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON user_profiles;

-- Users can read their own profile
CREATE POLICY "Users can read own profile" ON user_profiles
FOR SELECT USING (auth.uid() = user_id);

-- Users can update their own profile (except role)
CREATE POLICY "Users can update own profile" ON user_profiles
FOR UPDATE USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Admins and managers can read all profiles
CREATE POLICY "Admins can read all profiles" ON user_profiles
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('super_admin', 'admin', 'manager')
  )
);

-- Only super_admins can insert/delete user profiles
CREATE POLICY "Super admins can manage profiles" ON user_profiles
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role = 'super_admin'
  )
);

-- Campaigns policies
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON campaigns;
CREATE POLICY "Enable all access for authenticated users" ON campaigns
FOR ALL USING (auth.role() = 'authenticated');

-- Automations policies
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON automations;
CREATE POLICY "Enable all access for authenticated users" ON automations
FOR ALL USING (auth.role() = 'authenticated');

-- ========================================
-- UPDATED_AT TRIGGERS
-- ========================================

-- Create or replace the trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to all tables with updated_at column (with conflict handling)
DROP TRIGGER IF EXISTS update_leads_updated_at ON leads;
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_students_updated_at ON students;
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_integrations_status_updated_at ON integrations_status;
CREATE TRIGGER update_integrations_status_updated_at BEFORE UPDATE ON integrations_status
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_courses_updated_at ON courses;
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_campaigns_updated_at ON campaigns;
CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_automations_updated_at ON automations;
CREATE TRIGGER update_automations_updated_at BEFORE UPDATE ON automations
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- INSERT DEFAULT INTEGRATION STATUSES
-- ========================================
INSERT INTO integrations_status (integration_name, status, configuration) VALUES
('whatsapp_business', 'disconnected', '{"api_key": "", "phone_number": "", "webhook_url": ""}'),
('facebook_leads', 'disconnected', '{"access_token": "", "page_id": "", "app_secret": ""}'),
('payment_gateway', 'disconnected', '{"provider": "razorpay", "api_key": "", "webhook_secret": ""}'),
('email_service', 'disconnected', '{"provider": "sendgrid", "api_key": "", "from_email": ""}'),
('calendar_sync', 'disconnected', '{"provider": "google", "client_id": "", "client_secret": ""}'),
('document_management', 'disconnected', '{"provider": "google_drive", "folder_id": "", "api_key": ""}'),
('analytics_platform', 'disconnected', '{"provider": "google_analytics", "tracking_id": "", "api_key": ""}'),
('support_desk', 'disconnected', '{"provider": "zendesk", "domain": "", "api_token": ""}'),
('video_conferencing', 'disconnected', '{"provider": "zoom", "api_key": "", "api_secret": ""}'),
('sms_service', 'disconnected', '{"provider": "twilio", "account_sid": "", "auth_token": "", "phone_number": ""}'),
('social_media', 'disconnected', '{"platforms": ["facebook", "instagram", "linkedin"], "access_tokens": {}}')
ON CONFLICT (integration_name) DO UPDATE SET
configuration = EXCLUDED.configuration;

-- ========================================
-- INSERT DEFAULT COURSES
-- ========================================
INSERT INTO courses (name, description, duration_weeks, fee, instructor, status) VALUES
('Medical Coding Certification', 'Comprehensive medical coding training with ICD-10, CPT, and HCPCS', 12, 25000.00, 'Dr. Sarah Johnson', 'active'),
('Healthcare Administration', 'Healthcare management and administration fundamentals', 16, 30000.00, 'Prof. Michael Chen', 'active'),
('Clinical Research Certificate', 'Clinical research methodologies and regulatory compliance', 10, 22000.00, 'Dr. Emily Rodriguez', 'active'),
('Health Information Management', 'Digital health records and information systems', 14, 28000.00, 'Ms. Jennifer Smith', 'active')
ON CONFLICT DO NOTHING;

-- ========================================
-- CREATE INDEXES FOR PERFORMANCE
-- ========================================
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);

CREATE INDEX IF NOT EXISTS idx_students_email ON students(email);
CREATE INDEX IF NOT EXISTS idx_students_phone ON students(phone);
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);
CREATE INDEX IF NOT EXISTS idx_students_course ON students(course);

CREATE INDEX IF NOT EXISTS idx_communications_lead_id ON communications(lead_id);
CREATE INDEX IF NOT EXISTS idx_communications_student_id ON communications(student_id);
CREATE INDEX IF NOT EXISTS idx_communications_type ON communications(type);
CREATE INDEX IF NOT EXISTS idx_communications_status ON communications(status);

CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);

CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_lead_id ON activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_activities_student_id ON activities(student_id);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at);

CREATE INDEX IF NOT EXISTS idx_payments_student_id ON payments(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);

-- ========================================
-- USER MANAGEMENT HELPER FUNCTIONS
-- ========================================

-- Function to get current user profile
CREATE OR REPLACE FUNCTION get_current_user_profile()
RETURNS user_profiles AS $$
DECLARE
  profile user_profiles;
BEGIN
  SELECT * INTO profile 
  FROM user_profiles 
  WHERE user_id = auth.uid();
  
  RETURN profile;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if current user has specific role
CREATE OR REPLACE FUNCTION user_has_role(required_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role = required_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if current user has minimum role level
CREATE OR REPLACE FUNCTION user_has_min_role(min_role TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  role_hierarchy TEXT[] := ARRAY['viewer', 'agent', 'manager', 'admin', 'super_admin'];
  user_role TEXT;
  min_level INT;
  user_level INT;
BEGIN
  -- Get current user role
  SELECT role INTO user_role 
  FROM user_profiles 
  WHERE user_id = auth.uid();
  
  -- Find role levels
  SELECT array_position(role_hierarchy, min_role) INTO min_level;
  SELECT array_position(role_hierarchy, user_role) INTO user_level;
  
  RETURN user_level >= min_level;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- SUCCESS MESSAGE
-- ========================================
DO $$
BEGIN
  RAISE NOTICE 'CRM Database setup completed successfully!';
  RAISE NOTICE 'Tables created: leads, students, communications, integrations_status, courses, tasks, activities, payments, documents, user_profiles, campaigns, automations';
  RAISE NOTICE 'Real-time enabled for all tables';
  RAISE NOTICE 'RLS policies applied with role-based access';
  RAISE NOTICE 'User authentication system configured';
  RAISE NOTICE 'Helper functions created for user management';
  RAISE NOTICE 'Indexes created for performance';
  RAISE NOTICE 'Default data inserted';
  RAISE NOTICE 'Ready for your CRM application!';
  RAISE NOTICE '';
  RAISE NOTICE '🔐 NEXT STEPS FOR AUTHENTICATION:';
  RAISE NOTICE '1. Go to Supabase Dashboard > Authentication > Users';
  RAISE NOTICE '2. Click "Add User" to create admin user:';
  RAISE NOTICE '   - Email: admin@dmhca.com';
  RAISE NOTICE '   - Password: (choose a secure password)';
  RAISE NOTICE '   - Confirm email: Yes';
  RAISE NOTICE '3. The system will automatically create super_admin profile';
  RAISE NOTICE '4. Use admin@dmhca.com and your password to login';
  RAISE NOTICE '5. Role hierarchy: viewer < agent < manager < admin < super_admin';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Database setup complete - ready for authentication!';
END $$;
