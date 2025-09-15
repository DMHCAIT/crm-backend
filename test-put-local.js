const axios = require('axios');

const API_BASE = 'http://localhost:3001';

console.log('🔍 TESTING LOCAL USER UPDATE ENDPOINT');
console.log('=====================================');

async function testPutEndpoint() {
  try {
    // Test login first
    const loginResponse = await axios.post(`${API_BASE}/api/auth/login`, {
      email: 'santhosh@dmhca.edu',
      password: 'admin123'
    });
    
    console.log('✅ Login successful');
    const token = loginResponse.data.token;
    const headers = { 'Authorization': `Bearer ${token}` };
    
    // Test PUT endpoint directly
    console.log('\n🔍 Testing PUT /api/users endpoint...');
    
    const testId = 'test-id-123';
    const updateData = {
      name: 'Test Update',
      phone: '1234567890'
    };
    
    try {
      const response = await axios.put(`${API_BASE}/api/users?id=${testId}`, updateData, { headers });
      console.log('✅ PUT endpoint responded:', response.data);
    } catch (error) {
      console.log('❌ PUT request error:', error.response?.data || error.message);
      console.log('Status:', error.response?.status);
      console.log('URL:', error.config?.url);
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

testPutEndpoint();