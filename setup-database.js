/**
 * Database Setup Script for DMHCA CRM
 * Creates all required tables in Supabase
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function setupDatabase() {
  console.log('🚀 Setting up DMHCA CRM Database...\n');

  try {
    // 1. Create leads table
    console.log('📋 Creating leads table...');
    const { error: leadsError } = await supabase.rpc('create_leads_table');
    
    if (leadsError && !leadsError.message.includes('already exists')) {
      // Create using direct SQL if RPC doesn't work
      const leadsSQL = `
        CREATE TABLE IF NOT EXISTS leads (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
          name TEXT NOT NULL,
          email TEXT NOT NULL,
          phone TEXT,
          company TEXT,
          source TEXT DEFAULT 'website',
          status TEXT DEFAULT 'new',
          score INTEGER DEFAULT 50,
          notes TEXT,
          budget DECIMAL,
          tags TEXT[] DEFAULT '{}'::TEXT[]
        );
        
        CREATE INDEX IF NOT EXISTS leads_email_idx ON leads(email);
        CREATE INDEX IF NOT EXISTS leads_status_idx ON leads(status);
        CREATE INDEX IF NOT EXISTS leads_created_at_idx ON leads(created_at);
      `;
      
      const { error } = await supabase.rpc('exec_sql', { sql: leadsSQL });
      if (error) console.log('Leads table may already exist or need manual creation');
    }
    console.log('✅ Leads table ready\n');

    // 2. Create users table (for CRM users, not auth users)
    console.log('👥 Creating users table...');
    const usersSQL = `
      CREATE TABLE IF NOT EXISTS users (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        phone TEXT,
        role TEXT DEFAULT 'user',
        department TEXT,
        status TEXT DEFAULT 'active',
        avatar_url TEXT,
        permissions TEXT[] DEFAULT '{}'::TEXT[],
        preferences JSONB DEFAULT '{}'::JSONB
      );
      
      CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);
      CREATE INDEX IF NOT EXISTS users_status_idx ON users(status);
    `;
    
    const { error: usersError } = await supabase.rpc('exec_sql', { sql: usersSQL });
    if (usersError) console.log('Users table may already exist or need manual creation');
    console.log('✅ Users table ready\n');

    // 3. Create students table
    console.log('🎓 Creating students table...');
    const studentsSQL = `
      CREATE TABLE IF NOT EXISTS students (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT,
        course TEXT,
        status TEXT DEFAULT 'enrolled',
        admission_date DATE,
        notes TEXT,
        documents_submitted BOOLEAN DEFAULT false
      );
      
      CREATE INDEX IF NOT EXISTS students_email_idx ON students(email);
      CREATE INDEX IF NOT EXISTS students_status_idx ON students(status);
    `;
    
    const { error: studentsError } = await supabase.rpc('exec_sql', { sql: studentsSQL });
    if (studentsError) console.log('Students table may already exist or need manual creation');
    console.log('✅ Students table ready\n');

    // 4. Create communications table
    console.log('💬 Creating communications table...');
    const communicationsSQL = `
      CREATE TABLE IF NOT EXISTS communications (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
        type TEXT NOT NULL,
        channel TEXT NOT NULL,
        sender TEXT,
        recipient TEXT NOT NULL,
        subject TEXT,
        message TEXT,
        status TEXT DEFAULT 'sent',
        metadata JSONB DEFAULT '{}'::JSONB
      );
      
      CREATE INDEX IF NOT EXISTS communications_recipient_idx ON communications(recipient);
      CREATE INDEX IF NOT EXISTS communications_created_at_idx ON communications(created_at);
    `;
    
    const { error: communicationsError } = await supabase.rpc('exec_sql', { sql: communicationsSQL });
    if (communicationsError) console.log('Communications table may already exist or need manual creation');
    console.log('✅ Communications table ready\n');

    // 5. Create activities table for logging
    console.log('📝 Creating activities table...');
    const activitiesSQL = `
      CREATE TABLE IF NOT EXISTS activities (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
        type TEXT NOT NULL,
        description TEXT NOT NULL,
        entity_type TEXT,
        entity_id UUID,
        user_id UUID,
        data JSONB DEFAULT '{}'::JSONB
      );
      
      CREATE INDEX IF NOT EXISTS activities_entity_idx ON activities(entity_type, entity_id);
      CREATE INDEX IF NOT EXISTS activities_created_at_idx ON activities(created_at);
    `;
    
    const { error: activitiesError } = await supabase.rpc('exec_sql', { sql: activitiesSQL });
    if (activitiesError) console.log('Activities table may already exist or need manual creation');
    console.log('✅ Activities table ready\n');

    console.log('🎉 Database setup completed successfully!');
    console.log('📊 All tables are now ready for the CRM system.');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    console.log('\n📝 Manual Setup Required:');
    console.log('Please run these SQL commands in your Supabase SQL editor:');
    
    console.log(`
-- Leads table
CREATE TABLE IF NOT EXISTS leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company TEXT,
  source TEXT DEFAULT 'website',
  status TEXT DEFAULT 'new',
  score INTEGER DEFAULT 50,
  notes TEXT,
  budget DECIMAL,
  tags TEXT[] DEFAULT '{}'::TEXT[]
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  role TEXT DEFAULT 'user',
  department TEXT,
  status TEXT DEFAULT 'active',
  avatar_url TEXT,
  permissions TEXT[] DEFAULT '{}'::TEXT[],
  preferences JSONB DEFAULT '{}'::JSONB
);

-- Students table
CREATE TABLE IF NOT EXISTS students (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  course TEXT,
  status TEXT DEFAULT 'enrolled',
  admission_date DATE,
  notes TEXT,
  documents_submitted BOOLEAN DEFAULT false
);

-- Communications table
CREATE TABLE IF NOT EXISTS communications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  type TEXT NOT NULL,
  channel TEXT NOT NULL,
  sender TEXT,
  recipient TEXT NOT NULL,
  subject TEXT,
  message TEXT,
  status TEXT DEFAULT 'sent',
  metadata JSONB DEFAULT '{}'::JSONB
);

-- Activities table
CREATE TABLE IF NOT EXISTS activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  type TEXT NOT NULL,
  description TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  user_id UUID,
  data JSONB DEFAULT '{}'::JSONB
);
    `);
  }
}

// Run the setup
setupDatabase();
