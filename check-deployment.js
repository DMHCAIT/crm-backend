const axios = require('axios');

const API_BASE = 'https://crm-backend-production-5e32.up.railway.app';

async function checkDeployment() {
  try {
    console.log('🔍 CHECKING RAILWAY DEPLOYMENT STATUS');
    console.log('====================================');
    
    // Test health endpoint
    console.log('📡 Testing health endpoint...');
    const healthResponse = await axios.get(`${API_BASE}/health`);
    console.log('✅ Health check:', healthResponse.data);
    
    // Test if PUT endpoint exists by making a request without auth (should get 401, not 404)
    console.log('\n🔍 Testing PUT endpoint existence...');
    try {
      await axios.put(`${API_BASE}/api/users?id=test`, { test: 'data' });
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ PUT endpoint exists (401 Unauthorized - expected)');
      } else if (error.response?.status === 404) {
        console.log('❌ PUT endpoint NOT FOUND (404) - deployment not updated');
      } else {
        console.log(`🔍 PUT endpoint response: ${error.response?.status} - ${error.response?.data?.error || error.message}`);
      }
    }
    
  } catch (error) {
    console.log('❌ Deployment check failed:', error.message);
  }
}

checkDeployment();