// 🔍 Backend Health Check and Debug Script
const fetch = require('node-fetch');

const BACKEND_URL = 'https://crm-backend-fh34.onrender.com';
const ENDPOINTS_TO_TEST = [
  '/health',
  '/api/dashboard', 
  '/api/leads',
  '/api/analytics/realtime',
  '/api/webhook-leads'
];

async function testBackendHealth() {
  console.log('🔍 Testing Backend Health and Endpoints...\n');
  console.log(`Backend URL: ${BACKEND_URL}`);
  console.log('='.repeat(50));

  for (const endpoint of ENDPOINTS_TO_TEST) {
    try {
      console.log(`\n🔄 Testing: ${endpoint}`);
      const start = Date.now();
      
      const response = await fetch(`${BACKEND_URL}${endpoint}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token' // For protected endpoints
        },
        timeout: 10000 // 10 second timeout
      });
      
      const duration = Date.now() - start;
      console.log(`⏱️  Response time: ${duration}ms`);
      console.log(`📊 Status: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.text();
        console.log(`✅ Success: ${data.substring(0, 200)}${data.length > 200 ? '...' : ''}`);
      } else {
        const error = await response.text();
        console.log(`❌ Error: ${error.substring(0, 200)}${error.length > 200 ? '...' : ''}`);
      }
      
    } catch (error) {
      console.log(`💥 Failed: ${error.message}`);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('🏁 Health check complete');
}

testBackendHealth();