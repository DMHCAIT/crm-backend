// Database Setup and Health Check Script
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function setupDatabase() {
  console.log('🔧 CRM Backend Setup & Health Check');
  console.log('=====================================\n');

  // Check environment variables
  console.log('📋 Checking Environment Variables...');
  const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY', 'JWT_SECRET'];
  const missing = requiredEnvVars.filter(env => !process.env[env]);
  
  if (missing.length > 0) {
    console.log('❌ Missing required environment variables:');
    missing.forEach(env => console.log(`   - ${env}`));
    console.log('\n💡 Please update your .env file with the correct values.');
    return false;
  }
  console.log('✅ All required environment variables are set\n');

  // Test Supabase connection
  console.log('🔗 Testing Supabase Connection...');
  let supabase;
  try {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    
    // Test connection with a simple query
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
      
    if (error && error.code === 'PGRST116') {
      console.log('⚠️  Users table does not exist - will create it');
    } else if (error) {
      console.log('❌ Supabase connection failed:', error.message);
      return false;
    } else {
      console.log('✅ Successfully connected to Supabase');
    }
  } catch (err) {
    console.log('❌ Failed to initialize Supabase client:', err.message);
    return false;
  }

  // Check and create required tables
  console.log('\n📊 Checking Database Tables...');
  
  const tables = [
    {
      name: 'users',
      columns: `
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT,
        username TEXT,
        password_hash TEXT,
        role TEXT DEFAULT 'user' CHECK (role IN ('super_admin', 'admin', 'user')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      `
    },
    {
      name: 'leads',
      columns: `
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        "fullName" TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT,
        country TEXT,
        branch TEXT,
        qualification TEXT,
        source TEXT DEFAULT 'manual',
        course TEXT,
        status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'lost')),
        "assignedTo" TEXT,
        "followUp" TIMESTAMP WITH TIME ZONE,
        priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
        notes TEXT,
        tags TEXT[],
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      `
    }
  ];

  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table.name)
        .select('count')
        .limit(1);
        
      if (error && error.code === 'PGRST116') {
        console.log(`⚠️  Table '${table.name}' does not exist`);
        console.log(`💡 Create this table in your Supabase dashboard with these columns:`);
        console.log(`   ${table.columns.replace(/\s+/g, ' ').trim()}`);
      } else if (error) {
        console.log(`❌ Error checking table '${table.name}':`, error.message);
      } else {
        console.log(`✅ Table '${table.name}' exists and is accessible`);
      }
    } catch (err) {
      console.log(`❌ Failed to check table '${table.name}':`, err.message);
    }
  }

  console.log('\n🎯 Setup Complete!');
  console.log('Next steps:');
  console.log('1. Update your .env file with actual Supabase credentials');
  console.log('2. Create missing tables in your Supabase dashboard');
  console.log('3. Run: npm start');
  
  return true;
}

// Run setup if called directly
if (require.main === module) {
  setupDatabase();
}

module.exports = { setupDatabase };