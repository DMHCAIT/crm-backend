#!/usr/bin/env node

/**
 * Database Setup Script for Reporting Hierarchy
 * 
 * This script ensures the users table has the reports_to column
 * and populates it with sample hierarchy data if needed.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_KEY in your .env file');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Sample hierarchy data
const SAMPLE_USERS = [
  {
    id: '1',
    name: 'Santhosh Kumar',
    username: 'admin',
    email: 'admin@dmhca.com',
    role: 'super_admin',
    status: 'active',
    department: 'Management',
    designation: 'System Administrator',
    phone: '+91-9876543210',
    location: 'Delhi',
    join_date: '2024-01-01',
    reports_to: null // Super admin reports to no one
  },
  {
    id: '2',
    name: 'Dr. Priya Sharma',
    username: 'priya.sharma',
    email: 'priya@dmhca.com',
    role: 'senior_manager',
    status: 'active',
    department: 'Admissions',
    designation: 'Senior Admissions Manager',
    phone: '+91-9876543211',
    location: 'Delhi',
    join_date: '2024-02-01',
    reports_to: '1' // Reports to admin
  },
  {
    id: '3',
    name: 'Rahul Kumar',
    username: 'rahul.kumar',
    email: 'rahul@dmhca.com',
    role: 'manager',
    status: 'active',
    department: 'Operations',
    designation: 'Operations Manager',
    phone: '+91-9876543212',
    location: 'Hyderabad',
    join_date: '2024-03-01',
    reports_to: '2' // Reports to Priya
  },
  {
    id: '4',
    name: 'Anjali Patel',
    username: 'anjali.patel',
    email: 'anjali@dmhca.com',
    role: 'team_leader',
    status: 'active',
    department: 'Counseling',
    designation: 'Team Lead - Counseling',
    phone: '+91-9876543213',
    location: 'Kashmir',
    join_date: '2024-04-01',
    reports_to: '3' // Reports to Rahul
  },
  {
    id: '5',
    name: 'Suresh Reddy',
    username: 'suresh.reddy',
    email: 'suresh@dmhca.com',
    role: 'counselor',
    status: 'active',
    department: 'Counseling',
    designation: 'Senior Counselor',
    phone: '+91-9876543214',
    location: 'Remote',
    join_date: '2024-05-01',
    reports_to: '4' // Reports to Anjali
  }
];

async function checkAndSetupUsersTable() {
  console.log('🔍 Checking users table structure...');
  
  try {
    // Check if users table exists and get its structure
    const { data: tableInfo, error: structureError } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (structureError) {
      console.log('⚠️ Users table might not exist or there was an error:', structureError.message);
      
      // Try to create the users table with proper structure
      console.log('🔧 Attempting to ensure users table has correct structure...');
      
      // Note: In production, you would run this SQL through Supabase dashboard:
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          name TEXT NOT NULL,
          username TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE NOT NULL,
          role TEXT NOT NULL DEFAULT 'user',
          status TEXT NOT NULL DEFAULT 'active',
          department TEXT,
          designation TEXT,
          phone TEXT,
          location TEXT,
          join_date DATE,
          reports_to TEXT REFERENCES users(id),
          password_hash TEXT
        );
        
        -- Create indexes for better performance
        CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_users_reports_to ON users(reports_to);
        CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
        CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
      `;
      
      console.log('📝 SQL to run in Supabase dashboard:');
      console.log(createTableSQL);
      console.log('\n⚠️ Please run the above SQL in your Supabase dashboard SQL editor');
    } else {
      console.log('✅ Users table exists');
      
      // Check if reports_to column exists
      const firstUser = tableInfo && tableInfo[0];
      if (firstUser && !firstUser.hasOwnProperty('reports_to')) {
        console.log('⚠️ reports_to column not found, need to add it');
        console.log('📝 SQL to run in Supabase dashboard:');
        console.log('ALTER TABLE users ADD COLUMN reports_to TEXT REFERENCES users(id);');
        console.log('CREATE INDEX IF NOT EXISTS idx_users_reports_to ON users(reports_to);');
      } else {
        console.log('✅ reports_to column exists');
      }
    }
    
    // Check if we have any users
    const { data: existingUsers, error: countError } = await supabase
      .from('users')
      .select('id, username, email, reports_to')
      .limit(5);
    
    if (countError) {
      console.log('❌ Error checking existing users:', countError.message);
      return;
    }
    
    console.log(`📊 Found ${existingUsers?.length || 0} existing users`);
    
    if (!existingUsers || existingUsers.length === 0) {
      console.log('🔧 No users found, inserting sample hierarchy data...');
      
      // Insert sample users
      for (const user of SAMPLE_USERS) {
        const { error: insertError } = await supabase
          .from('users')
          .upsert(user, { onConflict: 'id' });
        
        if (insertError) {
          console.log(`❌ Error inserting user ${user.name}:`, insertError.message);
        } else {
          console.log(`✅ Inserted/Updated user: ${user.name} (${user.role})`);
        }
      }
      
      console.log('🎉 Sample hierarchy data inserted successfully!');
    } else {
      // Update existing users with reports_to if they don't have it
      console.log('🔧 Updating existing users with hierarchy relationships...');
      
      for (const sampleUser of SAMPLE_USERS) {
        const existingUser = existingUsers.find(u => u.username === sampleUser.username || u.email === sampleUser.email);
        
        if (existingUser && existingUser.reports_to !== sampleUser.reports_to) {
          const { error: updateError } = await supabase
            .from('users')
            .update({ reports_to: sampleUser.reports_to })
            .eq('id', existingUser.id);
          
          if (updateError) {
            console.log(`❌ Error updating reports_to for ${existingUser.username}:`, updateError.message);
          } else {
            console.log(`✅ Updated reports_to for ${existingUser.username}`);
          }
        }
      }
    }
    
    // Display final hierarchy
    console.log('\n📊 Current User Hierarchy:');
    const { data: allUsers } = await supabase
      .from('users')
      .select('id, name, username, role, reports_to')
      .order('created_at');
    
    if (allUsers) {
      const displayHierarchy = (users, parentId = null, level = 0) => {
        const children = users.filter(u => u.reports_to === parentId);
        children.forEach(user => {
          const indent = '  '.repeat(level);
          const reportsTo = users.find(u => u.id === user.reports_to);
          console.log(`${indent}${user.name} (${user.role}) ${reportsTo ? `→ ${reportsTo.name}` : '(Root)'}`);
          displayHierarchy(users, user.id, level + 1);
        });
      };
      
      displayHierarchy(allUsers);
    }
    
    console.log('\n🎉 Database hierarchy setup complete!');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the setup
checkAndSetupUsersTable().then(() => {
  console.log('✅ Setup completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Setup failed:', error);
  process.exit(1);
});