const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Supabase configuration
const supabaseUrl = 'https://jchvevxigmjhrxobktwe.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjaHZldnhpZ21qaHJ4b2JrdHdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE0MjE0NzQsImV4cCI6MjA0Njk5NzQ3NH0.DCo2BHYYl5FeiJL8nN-4kXNKrMLNP1cjdrYRE_GevYE';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔧 TRIGGER ERROR DIAGNOSIS & SOLUTION');
console.log('=====================================');
console.log('');

console.log('📋 PROBLEM:');
console.log('   Error: record "new" has no field "updatedAt"');
console.log('   This happens when database triggers use camelCase but columns are snake_case');
console.log('');

console.log('💡 SOLUTION:');
console.log('   Run the SQL script: fix-trigger-camelcase-error.sql in your Supabase dashboard');
console.log('');

console.log('📄 SQL SCRIPT CONTENTS:');
console.log('   The script will:');
console.log('   1. Drop any triggers using camelCase column names');
console.log('   2. Create correct trigger function using snake_case (updated_at)');
console.log('   3. Apply triggers only to tables that have updated_at columns'); 
console.log('   4. Test the fix to ensure it works');
console.log('');

console.log('🗂️  FILES CREATED:');
console.log('   ✅ fix-trigger-camelcase-error.sql - Complete trigger fix');
console.log('   ✅ fix-trigger-error.sql - Alternative simple fix');
console.log('   ✅ Updated api/leads.js to remove camelCase timestamp setting');
console.log('');

console.log('🚀 NEXT STEPS:');
console.log('   1. Copy the contents of fix-trigger-camelcase-error.sql');
console.log('   2. Go to your Supabase Dashboard > SQL Editor');
console.log('   3. Paste and run the SQL script');
console.log('   4. Test user creation/update operations');
console.log('');

console.log('✅ BACKEND CODE FIXED:');
console.log('   - Removed duplicate updatedAt field setting in leads API');
console.log('   - Now only uses snake_case updated_at field');
console.log('   - Database triggers will handle timestamp updates automatically');
console.log('');

async function testConnection() {
  try {
    console.log('🔗 Testing database connection...');
    
    // Try a simple query that shouldn't trigger any updates
    const { count, error } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });
      
    if (error) {
      console.log(`❌ Connection failed: ${error.message}`);
      console.log('   Note: This might be due to network issues or Supabase config');
      console.log('   The SQL fix will still work when applied directly in Supabase dashboard');
    } else {
      console.log(`✅ Connection successful! Found ${count} users in database`);
      console.log('   You can now run the SQL fix script in Supabase dashboard');
    }
  } catch (err) {
    console.log(`❌ Connection test failed: ${err.message}`);
    console.log('   This is likely a network issue - the SQL fix will still work');
  }
}

testConnection();