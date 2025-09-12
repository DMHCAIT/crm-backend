// Test Admin Login
const axios = require('axios');

async function testAdminLogin() {
  console.log('Testing admin login...');
  
  try {
    const response = await axios.post('http://localhost:3001/api/auth/login', {
      email: 'santhoshapplications@dmhca.in',
      password: 'Santhu@123'
    });

    console.log('✓ Login successful!');
    console.log('Response:', response.data);
    
    // Test the token by making an authenticated request
    if (response.data.token) {
      console.log('\nTesting token validity...');
      const verifyResponse = await axios.get('http://localhost:3001/api/auth/verify', {
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

testAdminLogin();