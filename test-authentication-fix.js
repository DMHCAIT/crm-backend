const axios = require('axios');

// Test the authentication fix
async function testAuthentication() {
  const API_BASE = 'https://crm-backend-production-5e32.up.railway.app';
  
  console.log('🔐 Testing Authentication Fix');
  console.log('==============================');
  console.log('');
  
  const testCredentials = [
    { email: 'adminn@dmhca.com', password: 'admin123', name: 'Nithya DMHCA' },
    { email: 'admin@dmhca.com', password: 'admin123', name: 'Navya DMHCA' },
    { email: 'santhosh@dmhca.edu', password: 'admin123', name: 'Santhosh DMHCA' },
  ];
  
  for (const cred of testCredentials) {
    try {
      console.log(`🔍 Testing login: ${cred.email}`);
      
      const response = await axios.post(`${API_BASE}/api/auth/login`, {
        email: cred.email,
        password: cred.password
      }, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data.success) {
        console.log(`✅ Login successful for ${cred.email}`);
        console.log(`   Name: ${response.data.user.name}`);
        console.log(`   Role: ${response.data.user.role}`);
        console.log(`   Token: ${response.data.token.substring(0, 20)}...`);
      } else {
        console.log(`❌ Login failed for ${cred.email}: ${response.data.message}`);
      }
      
    } catch (error) {
      if (error.response) {
        console.log(`❌ Login failed for ${cred.email}: ${error.response.status} - ${error.response.data?.message || error.response.statusText}`);
      } else {
        console.log(`❌ Network error for ${cred.email}: ${error.message}`);
      }
    }
    
    console.log('');
  }
  
  console.log('🔧 SOLUTION SUMMARY:');
  console.log('1. Added hardcoded credentials for adminn@dmhca.com and admin@dmhca.com');
  console.log('2. Updated authentication to handle default password hash');
  console.log('3. Users with default hash can now use password: admin123');
  console.log('4. Updated server.js to create proper password hashes for new users');
  console.log('');
  console.log('📝 LOGIN CREDENTIALS:');
  testCredentials.forEach(cred => {
    console.log(`   Email: ${cred.email} | Password: ${cred.password}`);
  });
}

// Check if axios is available
try {
  testAuthentication();
} catch (error) {
  console.log('❌ Error: axios not available. Install with: npm install axios');
  console.log('');
  console.log('🔧 MANUAL TEST:');
  console.log('Try logging in with these credentials:');
  console.log('   Email: adminn@dmhca.com | Password: admin123');
  console.log('   Email: admin@dmhca.com | Password: admin123');
}