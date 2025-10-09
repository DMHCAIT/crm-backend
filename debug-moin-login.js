// 🔍 Debug Moin Login Issue
// This script will check if user "Moin" exists and debug authentication

require('dotenv').config();
const bcrypt = require('bcrypt');

// Initialize Supabase client
let supabase = null;
try {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
    const { createClient } = require('@supabase/supabase-js');
    supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    console.log('✅ Supabase client initialized');
  } else {
    console.log('❌ Missing Supabase environment variables');
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Supabase initialization failed:', error.message);
  process.exit(1);
}

async function debugMoinLogin() {
  try {
    console.log('\n🔍 Debugging Moin Login Issue...\n');

    // 1. Check if Moin exists in database
    console.log('1️⃣ Checking if user "Moin" exists in database...');
    const { data: users, error: searchError } = await supabase
      .from('users')
      .select('*')
      .ilike('username', '%moin%');

    if (searchError) {
      console.log('❌ Error searching for Moin:', searchError.message);
      return;
    }

    if (!users || users.length === 0) {
      console.log('❌ No users found with username containing "Moin"');
      
      // Check all usernames that might be similar
      console.log('\n2️⃣ Checking for similar usernames...');
      const { data: allUsers, error: allError } = await supabase
        .from('users')
        .select('id, username, name, fullName, email, role, status')
        .eq('status', 'active')
        .limit(20);

      if (!allError && allUsers) {
        console.log('\n📋 Active users in system:');
        allUsers.forEach(user => {
          console.log(`   👤 ${user.username} | ${user.name || user.fullName || 'No name'} | ${user.email || 'No email'} | ${user.role}`);
        });
      }
      return;
    }

    console.log(`✅ Found ${users.length} user(s) matching "Moin":`);
    users.forEach((user, index) => {
      console.log(`\n👤 User ${index + 1}:`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Username: ${user.username}`);
      console.log(`   Name: ${user.name || user.fullName || 'Not set'}`);
      console.log(`   Email: ${user.email || 'Not set'}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Status: ${user.status}`);
      console.log(`   Has Password Hash: ${user.password_hash ? 'Yes' : 'No'}`);
      console.log(`   Created: ${user.created_at}`);
    });

    // 3. Test password verification for exact match
    const exactUser = users.find(u => u.username.toLowerCase() === 'moin');
    if (exactUser) {
      console.log('\n3️⃣ Testing password verification for exact match...');
      
      if (!exactUser.password_hash) {
        console.log('❌ User "Moin" has no password hash - cannot authenticate');
        console.log('💡 Solution: User needs password hash set in database');
        return;
      }

      // Test with common passwords
      const testPasswords = ['moin', 'moin123', 'password', '123456', 'admin'];
      
      for (const testPassword of testPasswords) {
        try {
          const isValid = await bcrypt.compare(testPassword, exactUser.password_hash);
          console.log(`   Testing "${testPassword}": ${isValid ? '✅ VALID' : '❌ Invalid'}`);
          if (isValid) {
            console.log(`🎉 Found valid password for Moin: "${testPassword}"`);
            break;
          }
        } catch (bcryptError) {
          console.log(`   Testing "${testPassword}": ❌ Error - ${bcryptError.message}`);
        }
      }
    }

    // 4. Check authentication endpoint availability
    console.log('\n4️⃣ Checking authentication configuration...');
    console.log(`   JWT_SECRET set: ${process.env.JWT_SECRET ? 'Yes' : 'No'}`);
    console.log(`   SUPABASE_URL set: ${process.env.SUPABASE_URL ? 'Yes' : 'No'}`);
    console.log(`   SUPABASE_SERVICE_KEY set: ${process.env.SUPABASE_SERVICE_KEY ? 'Yes' : 'No'}`);

  } catch (error) {
    console.error('❌ Debug error:', error);
  }
}

// Run the debug
debugMoinLogin()
  .then(() => {
    console.log('\n🔍 Debug complete. Check results above.');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Debug failed:', error);
    process.exit(1);
  });