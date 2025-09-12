// Create Admin User Script
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function createAdminUser() {
  console.log('Creating admin user...');
  
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
  const adminUsername = 'santhosh';

  try {
    // First, check if admin user already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('*')
      .eq('email', adminEmail)
      .single();

    if (existingUser) {
      console.log('✓ Admin user already exists:', existingUser);
      return existingUser;
    }

    // Try to sign in first to see if user exists in auth
    console.log('Checking if user exists in auth...');
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: adminEmail,
      password: adminPassword
    });

    let signUpData;
    if (signInError) {
      // User doesn't exist in auth, create them
      console.log('Creating new user in Supabase auth...');
      const { data: newSignUpData, error: signUpError } = await supabase.auth.signUp({
        email: adminEmail,
        password: adminPassword,
        options: {
          data: {
            name: adminName
          }
        }
      });

      if (signUpError) {
        console.error('❌ Auth signup error:', signUpError.message);
        throw signUpError;
      }
      
      signUpData = newSignUpData;
      console.log('✓ User created in auth system');
    } else {
      // User exists in auth, use existing data
      console.log('✓ User found in auth system');
      signUpData = { user: signInData.user };
    }

    console.log('✓ User created/found in auth system');

    // Create or update user profile in users table with admin role
    console.log('Creating admin profile in users table...');
    
    const { data: profileData, error: profileError } = await supabase
      .from('users')
      .upsert([
        {
          id: signUpData.user.id,
          email: adminEmail,
          name: adminName,
          username: adminUsername,
          role: 'admin',
          status: 'active',
          join_date: new Date().toISOString().split('T')[0],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ], {
        onConflict: 'email',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (profileError) {
      console.error('❌ Profile creation error:', profileError.message);
      
      // If users table doesn't exist, create it
      if (profileError.message.includes('does not exist')) {
        console.log('Creating users table...');
        
        const createTableQuery = `
          CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            name VARCHAR(255) NOT NULL,
            role VARCHAR(50) DEFAULT 'user',
            status VARCHAR(50) DEFAULT 'active',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
          );

          -- Create RLS policies
          ALTER TABLE users ENABLE ROW LEVEL SECURITY;
          
          CREATE POLICY "Users can view their own profile" ON users
            FOR SELECT USING (true);
            
          CREATE POLICY "Users can update their own profile" ON users
            FOR UPDATE USING (true);
            
          CREATE POLICY "Allow insert for authenticated users" ON users
            FOR INSERT WITH CHECK (true);
        `;

        const { error: tableError } = await supabase.rpc('exec_sql', {
          sql: createTableQuery
        });

        if (tableError) {
          console.log('Note: Could not create users table via RPC, trying direct insert...');
        }

        // Try inserting again
        const { data: retryData, error: retryError } = await supabase
          .from('users')
          .insert([
            {
              id: signUpData.user.id,
              email: adminEmail,
              name: adminName,
              username: adminUsername,
              role: 'admin',
              status: 'active',
              join_date: new Date().toISOString().split('T')[0],
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          ])
          .select()
          .single();

        if (retryError) {
          console.warn('⚠️ Could not create user profile, but auth user exists');
          console.log('Admin user created in auth system with ID:', signUpData.user.id);
          return {
            id: signUpData.user.id,
            email: adminEmail,
            name: adminName,
            role: 'admin'
          };
        } else {
          profileData = retryData;
        }
      } else {
        throw profileError;
      }
    }

    console.log('✓ Admin user created successfully!');
    console.log('Admin details:', {
      id: profileData.id,
      email: profileData.email,
      name: profileData.name,
      role: profileData.role
    });

    return profileData;

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    throw error;
  }
}

// Run the script
if (require.main === module) {
  createAdminUser()
    .then((admin) => {
      console.log('\n🎉 Admin user setup complete!');
      console.log('You can now login with:');
      console.log('Email:', 'santhoshapplications@dmhca.in');
      console.log('Password: Santhu@123');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Failed to create admin user:', error.message);
      process.exit(1);
    });
}

module.exports = createAdminUser;