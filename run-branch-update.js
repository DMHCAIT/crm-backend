const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables if .env file exists
if (fs.existsSync('.env')) {
  require('dotenv').config();
}

// Supabase configuration - using Railway environment variables
const supabaseUrl = process.env.SUPABASE_URL || 'https://jchvevxigmjhrxobktwe.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjaHZldnhpZ21qaHJ4b2JrdHdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE0MjE0NzQsImV4cCI6MjA0Njk5NzQ3NH0.DCo2BHYYl5FeiJL8nN-4kXNKrMLNP1cjdrYRE_GevYE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runBranchUpdate() {
  try {
    console.log('Adding branch column to users table...');
    
    // Read the SQL file
    const sqlContent = fs.readFileSync('add-branch-column.sql', 'utf8');
    
    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: sqlContent
    });
    
    if (error) {
      console.error('Error executing SQL:', error);
      
      // If RPC doesn't exist, try direct table alteration approach
      console.log('Trying alternative approach...');
      
      // Try to add the column if it doesn't exist
      const { error: alterError } = await supabase
        .from('users')
        .select('branch')
        .limit(1);
        
      if (alterError && alterError.message.includes('column "branch" does not exist')) {
        console.log('Branch column does not exist. Adding it...');
        // Note: Direct DDL commands cannot be executed via the standard Supabase client
        // This would need to be run via the Supabase dashboard SQL editor or a service role
        console.log('Please run the following SQL in your Supabase dashboard:');
        console.log('\n' + sqlContent);
      } else {
        console.log('Branch column already exists or other error occurred:', alterError);
      }
    } else {
      console.log('Branch column added successfully!');
    }
    
    // Test if branch column is accessible
    console.log('Testing branch column access...');
    const { data: testData, error: testError } = await supabase
      .from('users')
      .select('id, name, branch')
      .limit(1);
      
    if (testError) {
      console.error('Error testing branch column:', testError);
    } else {
      console.log('Branch column is accessible:', testData);
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

runBranchUpdate();