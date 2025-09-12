// Test Admin Login Against Railway Deployment
const axios = require('axios');

async function testAdminLoginProduction() {
  console.log('Testing admin login against Railway deployment...');
  
  try {
    const response = await axios.post('https://crm-backend-production-5e32.up.railway.app/api/auth/login', {
      email: 'santhoshapplications@dmhca.in',
      password: 'Santhu@123'
    });

    console.log('✓ Login successful!');
    console.log('Response:', response.data);
    
    // Test the token by making an authenticated request
    if (response.data.token) {
      console.log('\nTesting token validity...');
      const verifyResponse = await axios.get('https://crm-backend-production-5e32.up.railway.app/api/auth/verify', {
        headers: {
          'Authorization': `Bearer ${response.data.token}`
        }
      });
      
      console.log('✓ Token is valid!');
      console.log('Verify response:', verifyResponse.data);
    }
    
  } catch (error) {
    console.error('❌ Login failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

testAdminLoginProduction();