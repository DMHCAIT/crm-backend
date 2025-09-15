const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://jchvevxigmjhrxobktwe.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjaHZldnhpZ21qaHJ4b2JrdHdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE0MjE0NzQsImV4cCI6MjA0Njk5NzQ3NH0.DCo2BHYYl5FeiJL8nN-4kXNKrMLNP1cjdrYRE_GevYE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnoseTriggerError() {
  try {
    console.log('🔍 Diagnosing database trigger error...\n');
    
    // Test 1: Check current column names in users table
    console.log('1. Checking users table columns:');
    const { data: columns, error: colError } = await supabase
      .rpc('exec_sql', {
        sql_query: `
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = 'users' 
          AND table_schema = 'public'
          ORDER BY ordinal_position;
        `
      });
      
    if (colError) {
      console.log('   Using alternative method to check columns...');
      // Try to select from users table to see what columns exist
      const { data: sampleUser, error: userError } = await supabase
        .from('users')
        .select('*')
        .limit(1);
        
      if (sampleUser && sampleUser.length > 0) {
        console.log('   Available columns:', Object.keys(sampleUser[0]));
      } else if (userError) {
        console.log('   Error accessing users table:', userError.message);
      }
    } else if (columns) {
      console.log('   Columns found:', columns);
    }
    
    // Test 2: Try to create a simple user to reproduce the error
    console.log('\n2. Testing user creation to reproduce error:');
    const testUserData = {
      name: 'Test User',
      email: `test_${Date.now()}@example.com`,
      username: `test_${Date.now()}`,
      role: 'counselor',
      status: 'active',
      phone: '1234567890'
    };
    
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert([testUserData])
      .select()
      .single();
      
    if (createError) {
      console.log('   ❌ Error creating user:', createError.message);
      console.log('   Error details:', createError);
      
      if (createError.message.includes('updatedAt')) {
        console.log('\n✅ CONFIRMED: The error is related to updatedAt vs updated_at column naming!');
        console.log('   The trigger function is looking for "updatedAt" but the column is likely named "updated_at"');
      }
    } else {
      console.log('   ✅ User created successfully:', newUser);
      
      // Clean up test user
      await supabase
        .from('users')
        .delete()
        .eq('id', newUser.id);
      console.log('   🧹 Test user cleaned up');
    }
    
    // Test 3: Try to update a user to trigger the error
    console.log('\n3. Testing user update to trigger the error:');
    const { data: existingUsers, error: fetchError } = await supabase
      .from('users')
      .select('id')
      .limit(1);
      
    if (existingUsers && existingUsers.length > 0) {
      const userId = existingUsers[0].id;
      
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({ name: 'Test Update' })
        .eq('id', userId)
        .select()
        .single();
        
      if (updateError) {
        console.log('   ❌ Error updating user:', updateError.message);
        if (updateError.message.includes('updatedAt')) {
          console.log('\n✅ CONFIRMED: Update trigger has the updatedAt column naming issue!');
        }
      } else {
        console.log('   ✅ User updated successfully');
      }
    }
    
    console.log('\n📋 DIAGNOSIS COMPLETE');
    console.log('If you see updatedAt errors above, run the fix-trigger-error.sql in your Supabase dashboard.');
    
  } catch (error) {
    console.error('❌ Unexpected error during diagnosis:', error);
  }
}

async function testDatabaseConnection() {
  try {
    console.log('🔗 Testing basic database connection...');
    
    const { data, error } = await supabase
      .from('users')
      .select('count', { count: 'exact', head: true });
      
    if (error) {
      console.log('❌ Database connection error:', error.message);
      return false;
    } else {
      console.log('✅ Database connected successfully');
      console.log(`   Users table has ${data} records`);
      return true;
    }
  } catch (error) {
    console.log('❌ Connection test failed:', error.message);
    return false;
  }
}

async function main() {
  const isConnected = await testDatabaseConnection();
  if (isConnected) {
    await diagnoseTriggerError();
  }
}

main();