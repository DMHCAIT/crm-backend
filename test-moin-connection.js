// 🔍 Simple Connection Test for Moin Authentication
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://sbvgmunzrdcbvngiodvy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNidmdtdW56cmRjYnZuZ2lvZHZ5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNTY5NjQ0NywiZXhwIjoyMDUxMjcyNDQ3fQ.8DmvJCZl0Gdfi7GdC3zwRXrOKWFr-H1lezf2a8IqTfQ';

async function testConnection() {
  try {
    console.log('🔍 Testing Supabase connection...');
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Test basic connection
    const { data, error } = await supabase
      .from('users')
      .select('username, name, fullName, role, status')
      .limit(5);

    if (error) {
      console.log('❌ Connection error:', error.message);
      return;
    }

    console.log('✅ Connection successful!');
    console.log('📋 Sample users in system:');
    
    if (data && data.length > 0) {
      data.forEach(user => {
        console.log(`   👤 ${user.username} | ${user.name || user.fullName || 'No name'} | ${user.role} | ${user.status}`);
      });
      
      // Look for users that might be "Moin"
      const possibleMoin = data.filter(user => 
        user.username?.toLowerCase().includes('moin') || 
        user.name?.toLowerCase().includes('moin') ||
        user.fullName?.toLowerCase().includes('moin')
      );
      
      if (possibleMoin.length > 0) {
        console.log('\n🎯 Found potential "Moin" users:');
        possibleMoin.forEach(user => {
          console.log(`   ✅ ${user.username} | ${user.name || user.fullName} | ${user.role}`);
        });
      } else {
        console.log('\n❌ No users found matching "Moin"');
        
        // Get all active users to see exact usernames
        const { data: allUsers, error: allError } = await supabase
          .from('users')
          .select('username, name, fullName, role')
          .eq('status', 'active');
          
        if (!allError && allUsers) {
          console.log('\n📋 All active users:');
          allUsers.forEach(user => {
            console.log(`   👤 "${user.username}" | ${user.name || user.fullName || 'No name'} | ${user.role}`);
          });
        }
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testConnection();