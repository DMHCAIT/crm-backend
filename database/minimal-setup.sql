-- MINIMAL CRM DATABASE SETUP
-- Run this in your Supabase SQL Editor first

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
  source TEXT DEFAULT 'manual',
  status TEXT DEFAULT 'new',
  score INTEGER DEFAULT 0,
  notes TEXT,
  assigned_to UUID REFERENCES auth.users(id)
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
  course TEXT,
  status TEXT DEFAULT 'enrolled',
  progress INTEGER DEFAULT 0,
  notes TEXT
);

-- ========================================
-- 3. COMMUNICATIONS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS communications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  type TEXT DEFAULT 'email',
  direction TEXT DEFAULT 'outbound',
  subject TEXT,
  content TEXT,
  recipient TEXT,
  sender TEXT,
  status TEXT DEFAULT 'sent',
  lead_id UUID REFERENCES leads(id),
  student_id UUID REFERENCES students(id)
);

-- ========================================
-- 4. INTEGRATIONS STATUS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS integrations_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  integration_name TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'disconnected',
  last_sync TIMESTAMP WITH TIME ZONE,
  configuration JSONB DEFAULT '{}'::JSONB
);

-- ========================================
-- 5. USER PROFILES TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  full_name TEXT,
  phone TEXT,
  role TEXT DEFAULT 'agent',
  department TEXT,
  avatar_url TEXT,
  preferences JSONB DEFAULT '{}'::JSONB,
  is_active BOOLEAN DEFAULT TRUE
);

-- ========================================
-- 6. AUTO USER PROFILE CREATION
-- ========================================
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

-- Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ========================================
-- 7. ENABLE ROW LEVEL SECURITY
-- ========================================
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 8. SECURITY POLICIES (ALLOW ALL FOR NOW)
-- ========================================
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON leads;
CREATE POLICY "Enable all access for authenticated users" ON leads
FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON students;
CREATE POLICY "Enable all access for authenticated users" ON students
FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON communications;
CREATE POLICY "Enable all access for authenticated users" ON communications
FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON integrations_status;
CREATE POLICY "Enable all access for authenticated users" ON integrations_status
FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON user_profiles;
CREATE POLICY "Enable all access for authenticated users" ON user_profiles
FOR ALL USING (auth.role() = 'authenticated');

-- ========================================
-- 9. ENABLE REAL-TIME
-- ========================================
ALTER PUBLICATION supabase_realtime ADD TABLE leads;
ALTER PUBLICATION supabase_realtime ADD TABLE students;
ALTER PUBLICATION supabase_realtime ADD TABLE communications;
ALTER PUBLICATION supabase_realtime ADD TABLE integrations_status;
ALTER PUBLICATION supabase_realtime ADD TABLE user_profiles;

-- ========================================
-- 10. INSERT DEFAULT DATA
-- ========================================
INSERT INTO integrations_status (integration_name, status, configuration) VALUES
('whatsapp_business', 'disconnected', '{"api_key": "", "phone_number": ""}'),
('facebook_leads', 'disconnected', '{"access_token": "", "page_id": ""}'),
('payment_gateway', 'disconnected', '{"provider": "razorpay", "api_key": ""}'),
('email_service', 'disconnected', '{"provider": "sendgrid", "api_key": ""}')
ON CONFLICT (integration_name) DO NOTHING;

-- ========================================
-- SETUP COMPLETE MESSAGE
-- ========================================
SELECT 'Database setup complete! Now create your admin user.' as message;
