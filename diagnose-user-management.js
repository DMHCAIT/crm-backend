const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');

// Supabase configuration
const supabaseUrl = 'https://jchvevxigmjhrxobktwe.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjaHZldnhpZ21qaHJ4b2JrdHdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE0MjE0NzQsImV4cCI6MjA0Njk5NzQ3NH0.DCo2BHYYl5FeiJL8nN-4kXNKrMLNP1cjdrYRE_GevYE';

console.log('🔧 USER MANAGEMENT DIAGNOSTIC TOOL');
console.log('===================================');
console.log('');

async function diagnoseUserManagement() {
  try {
    // Test 1: Check password hashing
    console.log('1. Testing Password Hashing:');
    const testPassword = 'admin123';
    const hashedPassword = await bcrypt.hash(testPassword, 10);
    console.log(`   Original: ${testPassword}`);
    console.log(`   Hashed: ${hashedPassword}`);
    console.log(`   Hash valid: ${await bcrypt.compare(testPassword, hashedPassword)}`);
    console.log('');

    // Test 2: Check if we can connect to database
    console.log('2. Testing Database Connection:');
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { count, error } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });
        
      if (error) {
        console.log(`   ❌ Connection failed: ${error.message}`);
      } else {
        console.log(`   ✅ Connected successfully - ${count} users found`);
        
        // Test 3: Check users with default password hash
        console.log('\n3. Checking Users with Default Password Hash:');
        const { data: defaultUsers, error: defaultError } = await supabase
          .from('users')
          .select('id, name, email, password_hash')
          .eq('password_hash', '$2b$10$default_password_hash');
          
        if (defaultUsers && defaultUsers.length > 0) {
          console.log(`   Found ${defaultUsers.length} users with default password hash:`);
          defaultUsers.forEach(user => {
            console.log(`   - ${user.name} (${user.email})`);
          });
          
          // Fix these users
          console.log('\n4. Fixing Default Password Hashes:');
          const properHash = await bcrypt.hash('admin123', 10);
          
          const { data: updatedUsers, error: updateError } = await supabase
            .from('users')
            .update({ 
              password_hash: properHash,
              updated_at: new Date().toISOString()
            })
            .eq('password_hash', '$2b$10$default_password_hash')
            .select('name, email');
            
          if (updateError) {
            console.log(`   ❌ Update failed: ${updateError.message}`);
          } else {
            console.log(`   ✅ Fixed ${updatedUsers.length} users:`);
            updatedUsers.forEach(user => {
              console.log(`   - ${user.name} (${user.email}) - Now has proper hash`);
            });
          }
        } else {
          console.log('   ✅ No users with default password hash found');
        }
        
        // Test 4: Check if users can be updated
        console.log('\n5. Testing User Update Functionality:');
        const { data: testUser, error: fetchError } = await supabase
          .from('users')
          .select('id, name, email')
          .limit(1)
          .single();
          
        if (testUser) {
          console.log(`   Testing with user: ${testUser.name} (${testUser.email})`);
          
          // Try a harmless update
          const { data: updatedUser, error: updateTestError } = await supabase
            .from('users')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', testUser.id)
            .select('name, email, updated_at')
            .single();
            
          if (updateTestError) {
            console.log(`   ❌ Update test failed: ${updateTestError.message}`);
          } else {
            console.log(`   ✅ Update test successful for ${updatedUser.name}`);
          }
        }
      }
    } catch (connError) {
      console.log(`   ❌ Connection error: ${connError.message}`);
    }
    
  } catch (error) {
    console.error('❌ Diagnostic error:', error);
  }
}

// Test 5: Create a comprehensive user management solution
async function createUserManagementSolution() {
  console.log('\n🛠️  USER MANAGEMENT SOLUTIONS:');
  console.log('================================');
  console.log('');
  
  console.log('1. PASSWORD SAVING ISSUES:');
  console.log('   - Server.js now properly hashes passwords with bcrypt');
  console.log('   - Users API properly hashes passwords on update');
  console.log('   - Default password hash users will be fixed automatically');
  console.log('');
  
  console.log('2. USER EDITING SOLUTIONS:');
  console.log('   - Check if frontend is sending proper PUT requests to /api/users');
  console.log('   - Verify user has proper permissions for editing');
  console.log('   - Ensure all required fields are included in update requests');
  console.log('');
  
  console.log('3. PASSWORD CHANGE FUNCTIONALITY:');
  console.log('   - Users can change passwords through user management interface');
  console.log('   - Passwords are automatically hashed before saving');
  console.log('   - Old passwords are replaced with new hashed versions');
  console.log('');
  
  console.log('4. IMMEDIATE FIXES:');
  console.log('   a) Users with default hash can login with: admin123');
  console.log('   b) Admin can edit any user through user management page');
  console.log('   c) Password changes are automatically encrypted');
  console.log('   d) All new users get proper password hashes');
}

// Run diagnostics
diagnoseUserManagement().then(() => {
  createUserManagementSolution();
});