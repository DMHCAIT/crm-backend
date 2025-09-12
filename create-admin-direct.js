// Create Admin User Directly in Database
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

async function createAdminUserDirect() {
  console.log('Creating admin user directly in database...');
  
  // Initialize Supabase
  let supabase;
  try {
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
      supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY
      );
      console.log('✓ Supabase connected');
    } else {
      console.error('❌ Missing Supabase environment variables');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Supabase initialization failed:', error.message);
    process.exit(1);
  }

  const adminEmail = 'santhoshapplications@dmhca.in';
  const adminPassword = 'Santhu@123';
  const adminName = 'santhosh';
  const adminUsername = 'santhosh_admin';

  try {
    // Check if admin user already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('*')
      .eq('email', adminEmail)
      .single();

    if (existingUser) {
      console.log('✓ Admin user already exists:', {
        id: existingUser.id,
        email: existingUser.email,
        name: existingUser.name,
        username: existingUser.username,
        role: existingUser.role
      });
      return existingUser;
    }

    // Hash the password
    console.log('Hashing password...');
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(adminPassword, saltRounds);
    console.log('✓ Password hashed');

    // Generate UUID for the user
    const userId = uuidv4();

    // Insert admin user directly into users table
    console.log('Creating admin user in users table...');
    const { data: userData, error: insertError } = await supabase
      .from('users')
      .insert([
        {
          id: userId,
          email: adminEmail,
          name: adminName,
          username: adminUsername,
          password_hash: hashedPassword,
          role: 'super_admin',
          status: 'active',
          join_date: new Date().toISOString().split('T')[0],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (insertError) {
      console.error('❌ Error inserting user:', insertError.message);
      throw insertError;
    }

    console.log('✓ Admin user created successfully!');
    console.log('Admin details:', {
      id: userData.id,
      email: userData.email,
      name: userData.name,
      username: userData.username,
      role: userData.role,
      status: userData.status
    });

    return userData;

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    throw error;
  }
}

// Run the script
if (require.main === module) {
  createAdminUserDirect()
    .then((admin) => {
      console.log('\n🎉 Admin user setup complete!');
      console.log('You can now login with:');
      console.log('Email:', 'santhoshapplications@dmhca.in');
      console.log('Password: Santhu@123');
      console.log('\nNote: This user bypasses Supabase Auth and uses direct database authentication.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Failed to create admin user:', error.message);
      process.exit(1);
    });
}

module.exports = createAdminUserDirect;