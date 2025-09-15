const bcrypt = require('bcrypt');

async function generateSanthoshPasswordHash() {
  console.log('🔐 Generating proper password hash for Santhosh user');
  console.log('===============================================');
  console.log('');
  
  const originalPassword = 'Santhu@123';
  
  try {
    // Generate bcrypt hash with salt rounds 10 (same as our backend)
    const hashedPassword = await bcrypt.hash(originalPassword, 10);
    
    console.log('Original password:', originalPassword);
    console.log('Bcrypt hash:', hashedPassword);
    console.log('');
    
    // Verify the hash works
    const isValid = await bcrypt.compare(originalPassword, hashedPassword);
    console.log('Hash validation:', isValid ? '✅ Valid' : '❌ Invalid');
    console.log('');
    
    console.log('📋 SQL Update Statement:');
    console.log('========================');
    console.log(`UPDATE public.users`);
    console.log(`SET password_hash = '${hashedPassword}',`);
    console.log(`    updated_at = NOW()`);
    console.log(`WHERE email = 'santhosh@dmhca.in';`);
    console.log('');
    
    console.log('🎯 What This Fixes:');
    console.log('===================');
    console.log('✅ Converts plain text password to secure bcrypt hash');
    console.log('✅ Maintains same password (Santhu@123) but encrypted');
    console.log('✅ Compatible with backend authentication system');
    console.log('✅ User can still login with same credentials');
    console.log('');
    
    console.log('🔑 Login Credentials After Fix:');
    console.log('===============================');
    console.log('Email: santhosh@dmhca.in');
    console.log('Password: Santhu@123');
    console.log('');
    console.log('Alternative (if using hardcoded credentials):');
    console.log('Email: santhosh@dmhca.edu'); 
    console.log('Password: admin123');
    
  } catch (error) {
    console.error('❌ Error generating hash:', error);
  }
}

generateSanthoshPasswordHash();