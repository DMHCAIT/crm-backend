const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');

// Supabase configuration
const supabaseUrl = 'https://jchvevxigmjhrxobktwe.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjaHZldnhpZ21qaHJ4b2JrdHdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE0MjE0NzQsImV4cCI6MjA0Njk5NzQ3NH0.DCo2BHYYl5FeiJL8nN-4kXNKrMLNP1cjdrYRE_GevYE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateDefaultPasswordUsers() {
  try {
    console.log('🔧 Updating users with default password hashes...');
    
    // Find users with default password hash
    const { data: usersToUpdate, error: fetchError } = await supabase
      .from('users')
      .select('id, email, name, password_hash')
      .eq('password_hash', '$2b$10$default_password_hash');
      
    if (fetchError) {
      console.log('❌ Error fetching users:', fetchError.message);
      return;
    }
    
    if (!usersToUpdate || usersToUpdate.length === 0) {
      console.log('✅ No users with default password hash found');
      return;
    }
    
    console.log(`🔍 Found ${usersToUpdate.length} users with default password hash:`);
    usersToUpdate.forEach(user => {
      console.log(`   - ${user.name} (${user.email})`);
    });
    
    // Hash the default password 'admin123'
    const defaultPassword = 'admin123';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    
    console.log(`🔒 Setting password 'admin123' for all users with default hash...`);
    
    // Update all users with default hash
    const { data: updatedUsers, error: updateError } = await supabase
      .from('users')
      .update({ 
        password_hash: hashedPassword,
        updated_at: new Date().toISOString()
      })
      .eq('password_hash', '$2b$10$default_password_hash')
      .select('id, email, name');
      
    if (updateError) {
      console.log('❌ Error updating users:', updateError.message);
      return;
    }
    
    console.log(`✅ Successfully updated ${updatedUsers.length} users:`);
    updatedUsers.forEach(user => {
      console.log(`   ✓ ${user.name} (${user.email}) - Password set to 'admin123'`);
    });
    
    console.log('\n🎉 Password update complete!');
    console.log('📝 Users can now login with:');
    console.log('   - Email: their registered email');
    console.log('   - Password: admin123');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the update
updateDefaultPasswordUsers();