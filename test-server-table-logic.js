// Test Server Table Detection Logic
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function testServerTableLogic() {
  console.log('🔍 Testing server table detection logic...\n');
  
  // Initialize Supabase the same way the server does
  let supabase;
  try {
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
      supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY
      );
      console.log('✅ Supabase initialized (same as server)');
    }
  } catch (error) {
    console.error('❌ Supabase initialization failed:', error.message);
    return;
  }

  // Test the same table verification logic used in server.js
  console.log('\n🔍 Testing table verification (server logic)...');
  
  const requiredTables = ['users', 'leads', 'students'];
  let missingTables = [];

  for (const tableName of requiredTables) {
    try {
      console.log(`Checking table: ${tableName}`);
      
      // This is the same query the server uses
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);

      if (error) {
        console.log(`❌ ${tableName}: ${error.message}`);
        missingTables.push(tableName);
      } else {
        console.log(`✅ ${tableName}: OK (${data?.length || 0} sample records)`);
      }
    } catch (err) {
      console.log(`❌ ${tableName}: Exception - ${err.message}`);
      missingTables.push(tableName);
    }
  }

  console.log('\n📊 Results:');
  console.log('Missing tables:', missingTables.length > 0 ? missingTables : 'None');
  console.log('Server would show "missing tables" warning:', missingTables.length > 0 ? 'YES' : 'NO');

  if (missingTables.length > 0) {
    console.log('\n🔧 The server detected missing tables because:');
    console.log('- The table verification query failed');
    console.log('- This triggers the fallback creation method');
    console.log('- Even though tables exist, the server cannot verify them');
  } else {
    console.log('\n✅ All tables verified successfully');
    console.log('- Server should not show missing tables warning');
    console.log('- Database is properly connected');
  }

  // Test admin user access
  console.log('\n👤 Testing admin user access...');
  try {
    const { data: adminUser, error } = await supabase
      .from('users')
      .select('id, email, name, username, role')
      .eq('email', 'santhoshapplications@dmhca.in')
      .single();

    if (error) {
      console.log('❌ Admin user query failed:', error.message);
    } else {
      console.log('✅ Admin user accessible:', adminUser);
    }
  } catch (error) {
    console.log('❌ Admin user access failed:', error.message);
  }

  console.log('\n🎉 Server table logic test completed');
}

testServerTableLogic();