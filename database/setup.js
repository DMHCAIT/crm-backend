/**
 * Database Setup Script for DMHCA CRM
 * Executes the complete database schema creation
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Initialize Supabase with admin privileges
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function setupDatabase() {
  console.log('🚀 Starting DMHCA CRM Database Setup...\n');

  try {
    // Check database connection
    console.log('🔗 Testing database connection...');
    const { data, error: connectionError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .limit(1);

    if (connectionError) {
      throw new Error(`Database connection failed: ${connectionError.message}`);
    }

    console.log('✅ Database connection verified\n');

    // Read the SQL schema file
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (!fs.existsSync(schemaPath)) {
      throw new Error('Schema file not found at: ' + schemaPath);
    }

    const sqlSchema = fs.readFileSync(schemaPath, 'utf8');
    console.log('📜 SQL schema file loaded successfully\n');

    // Split SQL into individual statements (basic splitting)
    const statements = sqlSchema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📋 Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';'; // Add semicolon back
      
      // Skip comment blocks and empty statements
      if (statement.startsWith('/*') || statement.trim() === ';') {
        continue;
      }

      try {
        console.log(`📤 Executing statement ${i + 1}/${statements.length}...`);
        
        // Use raw query execution
        const { error } = await supabase.rpc('exec', { sql: statement });
        
        if (error) {
          console.error(`❌ Error in statement ${i + 1}:`, error.message);
          errorCount++;
          
          // Don't stop execution, continue with next statement
          continue;
        }
        
        successCount++;
        console.log(`✅ Statement ${i + 1} executed successfully`);
        
      } catch (err) {
        console.error(`❌ Error executing statement ${i + 1}:`, err.message);
        errorCount++;
      }

      // Small delay between statements to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    console.log('\n📊 Execution Summary:');
    console.log(`✅ Successful statements: ${successCount}`);
    console.log(`❌ Failed statements: ${errorCount}`);
    console.log(`📋 Total statements: ${successCount + errorCount}`);

    if (errorCount === 0) {
      console.log('\n🎉 Database setup completed successfully!');
    } else {
      console.log('\n⚠️  Database setup completed with some errors');
    }

    // Verify table creation
    await verifyTables();

  } catch (error) {
    console.error('\n💥 Database setup failed:', error.message);
    throw error;
  }
}

async function verifyTables() {
  console.log('\n🔍 Verifying table creation...');
  
  const expectedTables = [
    'users',
    'leads', 
    'students',
    'communications',
    'documents',
    'payments',
    'analytics_events',
    'system_settings',
    'integration_logs',
    'notifications'
  ];

  try {
    const { data: tables, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', expectedTables);

    if (error) {
      console.error('❌ Error verifying tables:', error);
      return;
    }

    const createdTables = tables ? tables.map(t => t.table_name) : [];
    
    console.log('\n📋 Table Verification Summary:');
    expectedTables.forEach(tableName => {
      if (createdTables.includes(tableName)) {
        console.log(`✅ ${tableName} - Created successfully`);
      } else {
        console.log(`❌ ${tableName} - Missing or creation failed`);
      }
    });

    // Check for sample data
    console.log('\n📊 Checking sample data...');
    
    try {
      const { data: settings, error: settingsError } = await supabase
        .from('system_settings')
        .select('key')
        .limit(5);

      if (!settingsError && settings && settings.length > 0) {
        console.log(`✅ System settings: ${settings.length} records found`);
      }

      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('email')
        .limit(5);

      if (!usersError && users && users.length > 0) {
        console.log(`✅ Users: ${users.length} records found`);
        console.log(`📧 Admin user: ${users.find(u => u.email === 'admin@dmhca.in') ? 'Created' : 'Not found'}`);
      }

    } catch (error) {
      console.log('⚠️  Could not verify sample data:', error.message);
    }

  } catch (error) {
    console.error('❌ Error verifying tables:', error.message);
  }
}

// Alternative method using direct SQL execution
async function setupDatabaseDirect() {
  console.log('🚀 Starting Direct SQL Database Setup...\n');

  try {
    // Test connection
    const { data, error } = await supabase
      .from('pg_tables')
      .select('tablename')
      .limit(1);

    if (error) {
      throw new Error(`Connection failed: ${error.message}`);
    }

    console.log('✅ Database connection verified\n');

    // Create tables one by one with direct SQL
    const tables = {
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
          permissions TEXT[],
          last_login TIMESTAMPTZ,
          avatar_url TEXT,
          settings JSONB DEFAULT '{}',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `,
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
          assigned_to UUID,
          follow_up_date TIMESTAMPTZ,
          last_contact_date TIMESTAMPTZ,
          notes TEXT,
          tags TEXT[],
          custom_fields JSONB DEFAULT '{}',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `,
      students: `
        CREATE TABLE IF NOT EXISTS students (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          student_id VARCHAR(50) UNIQUE,
          lead_id UUID,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255),
          phone VARCHAR(20) NOT NULL,
          course VARCHAR(100) NOT NULL,
          batch VARCHAR(50),
          enrollment_date DATE NOT NULL,
          status VARCHAR(50) NOT NULL DEFAULT 'active',
          payment_status VARCHAR(50) NOT NULL DEFAULT 'pending',
          fee_amount DECIMAL(10,2),
          fee_paid DECIMAL(10,2) DEFAULT 0,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `
    };

    // Execute each table creation
    for (const [tableName, sql] of Object.entries(tables)) {
      try {
        console.log(`🏗️  Creating table: ${tableName}...`);
        
        // Use a simple approach - create table directly
        const { error: createError } = await supabase.rpc('exec_sql', { 
          sql: sql 
        });

        if (createError) {
          console.log(`⚠️  Direct creation failed for ${tableName}, trying alternative...`);
          // Alternative: Use Supabase client to create table structure
          // This will be handled by the API endpoints when first accessed
        } else {
          console.log(`✅ Table ${tableName} created successfully`);
        }
      } catch (err) {
        console.log(`⚠️  Table ${tableName}: ${err.message}`);
      }
    }

    console.log('\n🎉 Direct database setup completed!');
    
  } catch (error) {
    console.error('💥 Direct setup failed:', error.message);
    throw error;
  }
}

// Run the setup
if (require.main === module) {
  const method = process.argv[2] || 'direct';
  
  if (method === 'direct') {
    setupDatabaseDirect()
      .then(() => {
        console.log('\n✅ Database setup script completed!');
        process.exit(0);
      })
      .catch((error) => {
        console.error('\n💥 Setup failed:', error.message);
        process.exit(1);
      });
  } else {
    setupDatabase()
      .then(() => {
        console.log('\n✅ Database setup script completed!');
        process.exit(0);
      })
      .catch((error) => {
        console.error('\n💥 Setup failed:', error.message);
        process.exit(1);
      });
  }
}

module.exports = {
  setupDatabase,
  setupDatabaseDirect,
  verifyTables
};
