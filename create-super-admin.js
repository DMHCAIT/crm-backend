// Create Super Admin User with Proper Password Hashing
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');
const readline = require('readline');

// Initialize Supabase
let supabase;
try {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    console.log('✅ Connected to Supabase');
  } else {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables');
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Supabase initialization failed:', error.message);
  process.exit(1);
}

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

function askPassword(question) {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    stdin.resume();
    stdin.setEncoding('utf8');
    stdin.setRawMode(true);

    process.stdout.write(question);
    
    let password = '';
    stdin.on('data', (char) => {
      char = char + '';
      
      switch (char) {
        case '\n':
        case '\r':
        case '\u0004':
          stdin.setRawMode(false);
          stdin.pause();
          process.stdout.write('\n');
          resolve(password);
          break;
        case '\u0003':
          process.exit();
          break;
        case '\u007f': // Backspace
          if (password.length > 0) {
            password = password.slice(0, -1);
            process.stdout.write('\b \b');
          }
          break;
        default:
          password += char;
          process.stdout.write('*');
          break;
      }
    });
  });
}

async function createSuperAdmin() {
  console.log('\n🚀 Creating Super Admin User for Enhanced CRM Backend\n');

  try {
    // Get user details
    const name = await askQuestion('Enter full name (default: Super Administrator): ') || 'Super Administrator';
    const username = await askQuestion('Enter username (default: superadmin): ') || 'superadmin';
    const email = await askQuestion('Enter email (default: admin@crmdmhca.com): ') || 'admin@crmdmhca.com';
    const phone = await askQuestion('Enter phone number (default: +91-9999999999): ') || '+91-9999999999';
    
    // Get password securely
    let password = await askPassword('Enter password (minimum 8 characters): ');
    
    // Validate password
    if (password.length < 8) {
      console.log('❌ Password must be at least 8 characters long');
      rl.close();
      process.exit(1);
    }

    // Confirm password
    const confirmPassword = await askPassword('Confirm password: ');
    
    if (password !== confirmPassword) {
      console.log('❌ Passwords do not match');
      rl.close();
      process.exit(1);
    }

    console.log('\n⏳ Creating super admin user...');

    // Hash the password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, email, username')
      .or(`email.eq.${email},username.eq.${username}`)
      .single();

    if (existingUser) {
      console.log('⚠️  User already exists with this email or username');
      const overwrite = await askQuestion('Do you want to update the existing user? (y/N): ');
      
      if (overwrite.toLowerCase() !== 'y' && overwrite.toLowerCase() !== 'yes') {
        console.log('❌ Operation cancelled');
        rl.close();
        process.exit(0);
      }

      // Update existing user
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({
          name: name,
          username: username,
          password_hash: passwordHash,
          phone: phone,
          role: 'super_admin',
          department: 'Administration',
          designation: 'Super Administrator',
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', existingUser.id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      console.log('✅ Super admin user updated successfully!');
      console.log(`📧 Email: ${updatedUser.email}`);
      console.log(`👤 Username: ${updatedUser.username}`);
      console.log(`🔐 Password: [Updated]`);

    } else {
      // Create new user
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert([{
          name: name,
          username: username,
          email: email,
          password_hash: passwordHash,
          phone: phone,
          role: 'super_admin',
          department: 'Administration',
          designation: 'Super Administrator',
          status: 'active',
          join_date: new Date().toISOString().split('T')[0],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      console.log('✅ Super admin user created successfully!');
      console.log(`📧 Email: ${newUser.email}`);
      console.log(`👤 Username: ${newUser.username}`);
      console.log(`🔐 Password: [Set securely]`);

      // Create user profile
      try {
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert([{
            user_id: newUser.id,
            full_name: name,
            phone: phone,
            role: 'super_admin',
            department: 'Administration',
            is_active: true,
            designation: 'Super Administrator',
            location: 'Head Office',
            employee_id: 'SA001',
            hire_date: new Date().toISOString().split('T')[0],
            permissions: {
              all: true,
              manage_users: true,
              manage_system: true,
              view_all_data: true,
              export_data: true
            },
            settings: {
              theme: 'light',
              notifications: true,
              dashboard_layout: 'advanced'
            },
            timezone: 'Asia/Kolkata',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }]);

        if (profileError) {
          console.log('⚠️  User created but profile creation failed:', profileError.message);
        } else {
          console.log('✅ User profile created successfully!');
        }
      } catch (profileErr) {
        console.log('⚠️  User created but profile creation failed:', profileErr.message);
      }
    }

    console.log('\n🎉 Super Admin Setup Complete!');
    console.log('\n📝 Login Details:');
    console.log(`   Email/Username: ${email} or ${username}`);
    console.log(`   Role: super_admin`);
    console.log(`   Status: active`);
    console.log('\n🔒 Security Notes:');
    console.log('   - Password is securely hashed with bcrypt');
    console.log('   - Full system access granted');
    console.log('   - Can manage all users and system settings');

  } catch (error) {
    console.error('❌ Error creating super admin:', error.message);
    
    if (error.code === '23505') {
      console.log('💡 Tip: User with this email or username already exists');
    }
  } finally {
    rl.close();
  }
}

// Run the script
createSuperAdmin();