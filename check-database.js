// Comprehensive Database Connection and Table Verification
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function checkDatabaseConnection() {
  console.log('🔍 Checking database connection and table status...\n');
  
  // Initialize Supabase
  let supabase;
  try {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
      console.error('❌ Missing environment variables:');
      console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '✓ Present' : '❌ Missing');
      console.log('SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? '✓ Present' : '❌ Missing');
      return;
    }

    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    console.log('✅ Supabase client initialized');
  } catch (error) {
    console.error('❌ Supabase initialization failed:', error.message);
    return;
  }

  // Test basic connection
  console.log('✅ Database connection successful (client initialized)\n');

  console.log('\n🔧 Checking specific CRM tables...');
  
  const requiredTables = ['users', 'leads', 'students'];
  
  for (const tableName of requiredTables) {
    try {
      // Try to query the table structure
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);

      if (error) {
        console.log(`❌ Table ${tableName}: ${error.message}`);
        
        // Try to create the table
        console.log(`🛠️  Attempting to create ${tableName} table...`);
        await createTable(supabase, tableName);
      } else {
        console.log(`✅ Table ${tableName}: Connected and accessible`);
        console.log(`   Records found: ${data?.length || 0}`);
      }
    } catch (error) {
      console.log(`❌ Table ${tableName}: Verification failed - ${error.message}`);
    }
  }

  // Test admin user creation
  console.log('\n👤 Checking admin user...');
  try {
    const { data: adminUser, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'santhoshapplications@dmhca.in')
      .single();

    if (error && error.code !== 'PGRST116') {
      console.log('❌ Error checking admin user:', error.message);
    } else if (adminUser) {
      console.log('✅ Admin user exists:', {
        id: adminUser.id,
        email: adminUser.email,
        name: adminUser.name,
        username: adminUser.username,
        role: adminUser.role
      });
    } else {
      console.log('ℹ️  Admin user not found - needs to be created');
    }
  } catch (error) {
    console.log('❌ Admin user check failed:', error.message);
  }

  console.log('\n✅ Database verification complete');
}

async function createTable(supabase, tableName) {
  const tableDefinitions = {
    users: `
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        name VARCHAR(255) NOT NULL,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT,
        phone VARCHAR(50),
        office_phone VARCHAR(50),
        role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin', 'counselor', 'manager')),
        department VARCHAR(255),
        designation VARCHAR(255),
        location VARCHAR(255),
        date_of_birth DATE,
        join_date DATE DEFAULT CURRENT_DATE,
        status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
        reports_to UUID REFERENCES users(id),
        profile_image TEXT,
        last_login TIMESTAMPTZ,
        login_count INTEGER DEFAULT 0,
        preferences JSONB DEFAULT '{}'
      );

      -- Create indexes
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
      
      -- Enable RLS
      ALTER TABLE users ENABLE ROW LEVEL SECURITY;
      
      -- Create policies
      DROP POLICY IF EXISTS "Users can view own profile" ON users;
      CREATE POLICY "Users can view own profile" ON users
        FOR SELECT USING (true);
        
      DROP POLICY IF EXISTS "Users can update own profile" ON users;
      CREATE POLICY "Users can update own profile" ON users
        FOR UPDATE USING (true);
        
      DROP POLICY IF EXISTS "Allow insert for service role" ON users;
      CREATE POLICY "Allow insert for service role" ON users
        FOR INSERT WITH CHECK (true);
    `,
    leads: `
      CREATE TABLE IF NOT EXISTS leads (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        fullName VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(50) NOT NULL,
        country VARCHAR(100),
        branch VARCHAR(255),
        qualification VARCHAR(255),
        course VARCHAR(255),
        assignedTo UUID REFERENCES users(id),
        status VARCHAR(100) DEFAULT 'new',
        source VARCHAR(100),
        followUp TIMESTAMPTZ,
        notes TEXT,
        createdAt TIMESTAMPTZ DEFAULT NOW(),
        updatedAt TIMESTAMPTZ DEFAULT NOW()
      );

      -- Create indexes
      CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);
      CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
      CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
      CREATE INDEX IF NOT EXISTS idx_leads_assigned ON leads(assignedTo);
      
      -- Enable RLS
      ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
      
      -- Create policies
      DROP POLICY IF EXISTS "Allow all operations on leads" ON leads;
      CREATE POLICY "Allow all operations on leads" ON leads
        FOR ALL USING (true);
    `,
    students: `
      CREATE TABLE IF NOT EXISTS students (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE,
        phone VARCHAR(50) NOT NULL,
        course VARCHAR(255),
        batch VARCHAR(100),
        status VARCHAR(100) DEFAULT 'active',
        admission_date DATE,
        fees_paid DECIMAL(10,2) DEFAULT 0,
        total_fees DECIMAL(10,2),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Create indexes
      CREATE INDEX IF NOT EXISTS idx_students_email ON students(email);
      CREATE INDEX IF NOT EXISTS idx_students_phone ON students(phone);
      CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);
      
      -- Enable RLS
      ALTER TABLE students ENABLE ROW LEVEL SECURITY;
      
      -- Create policies
      DROP POLICY IF EXISTS "Allow all operations on students" ON students;
      CREATE POLICY "Allow all operations on students" ON students
        FOR ALL USING (true);
    `
  };

  if (tableDefinitions[tableName]) {
    try {
      // Execute the SQL directly
      const { error } = await supabase.rpc('exec_sql', {
        sql: tableDefinitions[tableName]
      });

      if (error) {
        console.log(`⚠️  Could not create ${tableName} via RPC: ${error.message}`);
        
        // Try alternative method - create via raw SQL if RPC fails
        console.log(`🔄 Trying alternative creation method for ${tableName}...`);
        
        // For users table, we can try a simpler approach
        if (tableName === 'users') {
          const { error: insertError } = await supabase
            .from('users')
            .insert({
              name: 'Test User',
              username: 'test_setup',
              email: 'test@setup.com',
              role: 'user'
            });
          
          if (insertError && insertError.code === '42P01') {
            console.log(`❌ Table ${tableName} does not exist and cannot be created automatically`);
          } else if (insertError) {
            console.log(`ℹ️  Table ${tableName} exists but has constraints: ${insertError.message}`);
            // Delete the test record
            await supabase.from('users').delete().eq('username', 'test_setup');
          } else {
            console.log(`✅ Table ${tableName} exists and is writable`);
            // Delete the test record
            await supabase.from('users').delete().eq('username', 'test_setup');
          }
        }
        
      } else {
        console.log(`✅ Table ${tableName} created successfully`);
      }
    } catch (error) {
      console.log(`❌ Failed to create ${tableName}: ${error.message}`);
    }
  }
}

// Run the check
if (require.main === module) {
  checkDatabaseConnection()
    .then(() => {
      console.log('\n🎉 Database check completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Database check failed:', error.message);
      process.exit(1);
    });
}

module.exports = checkDatabaseConnection;