// Simple Super Admin Creator (works without environment setup)
const bcrypt = require('bcrypt');

async function generateSuperAdminCredentials() {
  console.log('🚀 Super Admin Credentials Generator\n');

  // Default credentials (you can modify these)
  const credentials = {
    name: 'Super Administrator',
    username: 'superadmin',
    email: 'admin@crmdmhca.com',
    password: 'SuperAdmin@123', // Change this to your desired password
    phone: '+91-9999999999',
    role: 'super_admin'
  };

  try {
    // Generate password hash
    console.log('⏳ Generating secure password hash...');
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(credentials.password, saltRounds);

    console.log('✅ Super Admin Credentials Generated!\n');
    console.log('📋 SQL INSERT Statement:');
    console.log('=====================================');

    const sql = `
-- Insert Super Admin User
INSERT INTO public.users (
  id, name, username, email, password_hash, phone, role, 
  department, designation, status, join_date, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  '${credentials.name}',
  '${credentials.username}',
  '${credentials.email}',
  '${passwordHash}',
  '${credentials.phone}',
  '${credentials.role}',
  'Administration',
  'Super Administrator',
  'active',
  CURRENT_DATE,
  NOW(),
  NOW()
) ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  updated_at = NOW();

-- Verify the user was created
SELECT id, name, username, email, role, status 
FROM public.users 
WHERE email = '${credentials.email}';
`;

    console.log(sql);
    console.log('=====================================\n');

    console.log('🔐 Login Credentials:');
    console.log(`   📧 Email: ${credentials.email}`);
    console.log(`   👤 Username: ${credentials.username}`);
    console.log(`   🔑 Password: ${credentials.password}`);
    console.log(`   🛡️  Role: ${credentials.role}\n`);

    console.log('📝 Instructions:');
    console.log('1. Copy the SQL statement above');
    console.log('2. Run it in your Supabase SQL Editor');
    console.log('3. Use the login credentials to access your CRM');
    console.log('4. IMPORTANT: Change the password after first login!\n');

    console.log('🔒 Security Notes:');
    console.log('   ✅ Password is bcrypt hashed');
    console.log('   ✅ Super admin role with full access');
    console.log('   ✅ Safe to run multiple times (uses ON CONFLICT)');

  } catch (error) {
    console.error('❌ Error generating credentials:', error.message);
  }
}

// Run the generator
generateSuperAdminCredentials();