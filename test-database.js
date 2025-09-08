const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

console.log('🔍 Testing Database Connection...');
console.log('=====================================');

// Check environment variables
console.log('Environment Variables:');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Set' : '❌ Missing');
console.log('SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? '✅ Set' : '❌ Missing');
console.log('');

async function testDatabaseConnection() {
  try {
    // Initialize Supabase client
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    console.log('🔌 Testing connection...');
    
    // Test 1: Basic connection test
    const { data: connectionTest, error: connectionError } = await supabase
      .from('leads')
      .select('count', { count: 'exact', head: true });

    if (connectionError) {
      console.log('❌ Connection failed:', connectionError.message);
      return false;
    }
    
    console.log('✅ Database connection successful!');
    console.log('📊 Total leads in database:', connectionTest);
    console.log('');

    // Test 2: Check essential tables
    console.log('🔍 Checking essential tables...');
    const tablesToCheck = ['leads', 'students', 'user_profiles', 'communications', 'activities'];
    
    for (const table of tablesToCheck) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          console.log(`❌ Table "${table}": ${error.message}`);
        } else {
          console.log(`✅ Table "${table}": ${data} records`);
        }
      } catch (err) {
        console.log(`❌ Table "${table}": ${err.message}`);
      }
    }

    console.log('');
    
    // Test 3: Test a simple query
    console.log('🧪 Testing sample queries...');
    
    const { data: sampleLeads, error: leadsError } = await supabase
      .from('leads')
      .select('id, name, email, status')
      .limit(3);

    if (leadsError) {
      console.log('❌ Sample leads query failed:', leadsError.message);
    } else {
      console.log('✅ Sample leads query successful');
      console.log('Sample data:', sampleLeads);
    }

    console.log('');
    console.log('🎯 DATABASE CONNECTION TEST COMPLETE');
    console.log('=====================================');
    return true;

  } catch (error) {
    console.log('❌ Database test failed:', error.message);
    return false;
  }
}

// Run the test
testDatabaseConnection().then(success => {
  if (success) {
    console.log('🟢 Database is properly connected and ready!');
  } else {
    console.log('🔴 Database connection issues detected!');
  }
  process.exit(success ? 0 : 1);
});
