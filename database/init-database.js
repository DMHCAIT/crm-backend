/**
 * DMHCA CRM Database Initialization Script
 * Creates all required tables for the CRM system
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase with admin privileges
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Database schema definitions
const tableSchemas = {
  // Users table - Core authentication and user management
  users: `
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

    -- Create indexes for better performance
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
    CREATE INDEX IF NOT EXISTS idx_users_department ON users(department);

    -- Enable RLS (Row Level Security)
    ALTER TABLE users ENABLE ROW LEVEL SECURITY;
    
    -- RLS Policies
    CREATE POLICY "Users can read their own data" ON users
      FOR SELECT USING (auth.uid()::text = id::text);
    
    CREATE POLICY "Admins can read all users" ON users
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM users 
          WHERE users.id::text = auth.uid()::text 
          AND users.role IN ('admin', 'super_admin', 'senior_manager')
        )
      );
  `,

  // Leads table - Lead management and tracking
  leads: `
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

    -- Indexes for leads table
    CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
    CREATE INDEX IF NOT EXISTS idx_leads_stage ON leads(stage);
    CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(lead_source);
    CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);
    CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);
    CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);
    CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);

    -- Enable RLS
    ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

    -- RLS Policies for leads
    CREATE POLICY "Users can read leads assigned to them" ON leads
      FOR SELECT USING (assigned_to::text = auth.uid()::text);
    
    CREATE POLICY "Managers can read all leads" ON leads
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM users 
          WHERE users.id::text = auth.uid()::text 
          AND users.role IN ('admin', 'super_admin', 'senior_manager', 'manager')
        )
      );
  `,

  // Students table - Enrolled student management
  students: `
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

    -- Indexes for students table
    CREATE INDEX IF NOT EXISTS idx_students_student_id ON students(student_id);
    CREATE INDEX IF NOT EXISTS idx_students_course ON students(course);
    CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);
    CREATE INDEX IF NOT EXISTS idx_students_batch ON students(batch);
    CREATE INDEX IF NOT EXISTS idx_students_enrollment_date ON students(enrollment_date);
    CREATE INDEX IF NOT EXISTS idx_students_payment_status ON students(payment_status);
    CREATE INDEX IF NOT EXISTS idx_students_phone ON students(phone);

    -- Enable RLS
    ALTER TABLE students ENABLE ROW LEVEL SECURITY;
  `,

  // Communications table - All communication logs
  communications: `
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

    -- Indexes for communications
    CREATE INDEX IF NOT EXISTS idx_communications_lead_id ON communications(lead_id);
    CREATE INDEX IF NOT EXISTS idx_communications_student_id ON communications(student_id);
    CREATE INDEX IF NOT EXISTS idx_communications_user_id ON communications(user_id);
    CREATE INDEX IF NOT EXISTS idx_communications_type ON communications(type);
    CREATE INDEX IF NOT EXISTS idx_communications_created_at ON communications(created_at);

    -- Enable RLS
    ALTER TABLE communications ENABLE ROW LEVEL SECURITY;
  `,

  // Documents table - Document management
  documents: `
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

    -- Indexes for documents
    CREATE INDEX IF NOT EXISTS idx_documents_lead_id ON documents(lead_id);
    CREATE INDEX IF NOT EXISTS idx_documents_student_id ON documents(student_id);
    CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);
    CREATE INDEX IF NOT EXISTS idx_documents_file_type ON documents(file_type);

    -- Enable RLS
    ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
  `,

  // Payments table - Payment tracking
  payments: `
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

    -- Indexes for payments
    CREATE INDEX IF NOT EXISTS idx_payments_student_id ON payments(student_id);
    CREATE INDEX IF NOT EXISTS idx_payments_payment_id ON payments(payment_id);
    CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
    CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);

    -- Enable RLS
    ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
  `,

  // Analytics Events table - Track all user actions
  analytics_events: `
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

    -- Indexes for analytics
    CREATE INDEX IF NOT EXISTS idx_analytics_user_id ON analytics_events(user_id);
    CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics_events(event_type);
    CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON analytics_events(created_at);

    -- Enable RLS
    ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
  `,

  // System Settings table - Application configuration
  system_settings: `
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

    -- Indexes for settings
    CREATE INDEX IF NOT EXISTS idx_settings_key ON system_settings(key);
    CREATE INDEX IF NOT EXISTS idx_settings_category ON system_settings(category);

    -- Enable RLS
    ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
  `,

  // Integration Logs table - Track external integrations
  integration_logs: `
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

    -- Indexes for integration logs
    CREATE INDEX IF NOT EXISTS idx_integration_logs_type ON integration_logs(integration_type);
    CREATE INDEX IF NOT EXISTS idx_integration_logs_status ON integration_logs(status);
    CREATE INDEX IF NOT EXISTS idx_integration_logs_created_at ON integration_logs(created_at);

    -- Enable RLS
    ALTER TABLE integration_logs ENABLE ROW LEVEL SECURITY;
  `,

  // Notifications table - System notifications
  notifications: `
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

    -- Indexes for notifications
    CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
    CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

    -- Enable RLS
    ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
  `
};

// Function to create database tables
async function initializeDatabase() {
  console.log('🚀 Starting DMHCA CRM Database Initialization...\n');

  try {
    // Check database connection
    const { data, error: connectionError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .limit(1);

    if (connectionError) {
      throw new Error(`Database connection failed: ${connectionError.message}`);
    }

    console.log('✅ Database connection verified\n');

    // Create each table
    for (const [tableName, schema] of Object.entries(tableSchemas)) {
      console.log(`🏗️  Creating table: ${tableName}...`);
      
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: schema });
        
        if (error) {
          console.error(`❌ Error creating table ${tableName}:`, error);
          // Continue with other tables even if one fails
        } else {
          console.log(`✅ Table ${tableName} created successfully`);
        }
      } catch (err) {
        console.error(`❌ Error creating table ${tableName}:`, err.message);
      }
      
      // Small delay between table creations
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('\n🎉 Database initialization completed!');

    // Insert default system settings
    await insertDefaultSettings();
    
    // Insert default admin user if not exists
    await insertDefaultAdminUser();

    console.log('\n✅ All database operations completed successfully!');

  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    throw error;
  }
}

// Function to insert default system settings
async function insertDefaultSettings() {
  console.log('\n⚙️  Inserting default system settings...');
  
  const defaultSettings = [
    {
      key: 'app_name',
      value: { text: 'DMHCA CRM' },
      category: 'general',
      description: 'Application name',
      is_public: true
    },
    {
      key: 'app_version',
      value: { version: '2.1.0' },
      category: 'general',
      description: 'Application version',
      is_public: true
    },
    {
      key: 'lead_sources',
      value: { sources: ['Website', 'WhatsApp', 'Facebook', 'Phone Call', 'Walk-in', 'Referral', 'Google Ads', 'Social Media'] },
      category: 'leads',
      description: 'Available lead sources',
      is_public: false
    },
    {
      key: 'lead_statuses',
      value: { statuses: ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost'] },
      category: 'leads',
      description: 'Available lead statuses',
      is_public: false
    },
    {
      key: 'user_roles',
      value: { roles: ['counselor', 'team_leader', 'manager', 'senior_manager', 'admin', 'super_admin'] },
      category: 'users',
      description: 'Available user roles',
      is_public: false
    },
    {
      key: 'courses',
      value: { courses: ['Full Stack Development', 'Digital Marketing', 'Data Science', 'UI/UX Design', 'Mobile App Development', 'Python Programming', 'Java Development'] },
      category: 'courses',
      description: 'Available courses',
      is_public: true
    }
  ];

  for (const setting of defaultSettings) {
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert(setting, { onConflict: 'key' });
      
      if (error) {
        console.error(`❌ Error inserting setting ${setting.key}:`, error);
      } else {
        console.log(`✅ Setting ${setting.key} inserted/updated`);
      }
    } catch (err) {
      console.error(`❌ Error inserting setting ${setting.key}:`, err.message);
    }
  }
}

// Function to insert default admin user
async function insertDefaultAdminUser() {
  console.log('\n👤 Checking for admin user...');
  
  try {
    // Check if admin user exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('email', 'admin@dmhca.in')
      .single();

    if (!existingUser) {
      console.log('👤 Creating default admin user...');
      
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          email: 'admin@dmhca.in',
          name: 'DMHCA Admin',
          role: 'super_admin',
          department: 'Administration',
          status: 'active',
          permissions: ['*'] // All permissions
        });

      if (insertError) {
        console.error('❌ Error creating admin user:', insertError);
      } else {
        console.log('✅ Default admin user created');
        console.log('📧 Email: admin@dmhca.in');
        console.log('⚠️  Please set up authentication for this user');
      }
    } else {
      console.log('✅ Admin user already exists');
    }
  } catch (error) {
    console.error('❌ Error checking/creating admin user:', error.message);
  }
}

// Function to verify table creation
async function verifyTables() {
  console.log('\n🔍 Verifying table creation...');
  
  try {
    const { data: tables, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', Object.keys(tableSchemas));

    if (error) {
      console.error('❌ Error verifying tables:', error);
      return;
    }

    const createdTables = tables.map(t => t.table_name);
    const expectedTables = Object.keys(tableSchemas);
    
    console.log('\n📊 Table Creation Summary:');
    expectedTables.forEach(tableName => {
      if (createdTables.includes(tableName)) {
        console.log(`✅ ${tableName} - Created`);
      } else {
        console.log(`❌ ${tableName} - Missing`);
      }
    });

  } catch (error) {
    console.error('❌ Error verifying tables:', error.message);
  }
}

// Main execution
if (require.main === module) {
  // Only run if this file is executed directly
  initializeDatabase()
    .then(() => verifyTables())
    .then(() => {
      console.log('\n🎉 Database initialization script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Database initialization failed:', error.message);
      process.exit(1);
    });
}

module.exports = {
  initializeDatabase,
  verifyTables,
  tableSchemas
};
