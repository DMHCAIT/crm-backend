const axios = require('axios');

// Test configuration
const API_BASE = 'https://crm-backend-main-production.up.railway.app';
const TEST_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtYWlsIjoic2FudGhvc2hAZG1oY2EuaW4iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJpYXQiOjE3MzQ5ODI4NDF9.WT_SECRET';

async function testLeadEndpoints() {
    console.log('🔍 Testing Lead Database Connectivity...\n');
    
    const headers = {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json'
    };

    try {
        // Test 1: Check API health
        console.log('1. Testing API Health...');
        const healthResponse = await axios.get(`${API_BASE}/api/health`);
        console.log('✅ Health Status:', healthResponse.data);
        
        // Test 2: Check leads endpoint
        console.log('\n2. Testing Leads Endpoint...');
        const leadsResponse = await axios.get(`${API_BASE}/api/leads`, { headers });
        console.log('✅ Leads Response Status:', leadsResponse.status);
        console.log('✅ Leads Count:', leadsResponse.data.length);
        
        if (leadsResponse.data.length > 0) {
            console.log('✅ Sample Lead:', JSON.stringify(leadsResponse.data[0], null, 2));
        } else {
            console.log('⚠️ No leads found in database');
        }
        
        // Test 3: Check dashboard endpoint
        console.log('\n3. Testing Dashboard Endpoint...');
        const dashboardResponse = await axios.get(`${API_BASE}/api/dashboard`, { headers });
        console.log('✅ Dashboard Status:', dashboardResponse.status);
        console.log('✅ Dashboard Data:', JSON.stringify(dashboardResponse.data, null, 2));
        
    } catch (error) {
        console.log('❌ Error testing endpoints:');
        if (error.response) {
            console.log('Status:', error.response.status);
            console.log('Data:', error.response.data);
        } else {
            console.log('Error:', error.message);
        }
    }
}

// Run the test
testLeadEndpoints().then(() => {
    console.log('\n🎯 Test completed!');
}).catch(console.error);