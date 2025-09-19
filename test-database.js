// Quick database connection test
const { createClient } = require('@supabase/supabase-js');

async function testDatabaseConnection() {
  console.log('🔍 Testing database connection...');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.log('❌ Missing environment variables');
    console.log('SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
    console.log('SUPABASE_SERVICE_KEY:', supabaseKey ? 'Set' : 'Missing');
    return;
  }
  
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Test 1: Simple connection test
    console.log('🔍 Testing basic connection...');
    const { data: tables, error: tablesError } = await supabase
      .from('login_users')
      .select('*')
      .limit(1);
    
    if (tablesError) {
      console.log('❌ Connection error:', tablesError.message);
      return;
    }
    
    console.log('✅ Database connection successful');
    console.log('📊 Current login_users records:', tables);
    
    // Test 2: Check if admin user exists
    const { data: adminUser, error: adminError } = await supabase
      .from('login_users')
      .select('*')
      .eq('username', 'admin')
      .single();
    
    if (adminError && adminError.code !== 'PGRST116') {
      console.log('❌ Error checking admin user:', adminError.message);
      return;
    }
    
    if (!adminUser) {
      console.log('⚠️ Admin user not found, creating...');
      
      const { data: insertResult, error: insertError } = await supabase
        .from('login_users')
        .insert({ username: 'admin', password: 'admin123' })
        .select();
      
      if (insertError) {
        console.log('❌ Error creating admin user:', insertError.message);
        return;
      }
      
      console.log('✅ Admin user created successfully:', insertResult);
    } else {
      console.log('✅ Admin user exists:', adminUser);
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

// Run the test
testDatabaseConnection();