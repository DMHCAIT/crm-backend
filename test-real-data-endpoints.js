const axios = require('axios');

// Test the real data endpoints
const API_BASE = 'https://crm-backend-production-5e32.up.railway.app';

async function testRealDataEndpoints() {
    console.log('🔍 Testing Real Data API Endpoints...\n');
    
    const headers = {
        'Authorization': 'Bearer test-token',
        'Content-Type': 'application/json'
    };

    try {
        // Test 1: Dashboard with real data
        console.log('1. Testing Dashboard (Real Data)...');
        const dashboardResponse = await axios.get(`${API_BASE}/api/dashboard`, { headers });
        console.log('✅ Dashboard Status:', dashboardResponse.status);
        console.log('✅ Dashboard Data:', JSON.stringify(dashboardResponse.data, null, 2));
        
        // Test 2: Dashboard Stats with real data
        console.log('\n2. Testing Dashboard Stats (Real Data)...');
        const statsResponse = await axios.get(`${API_BASE}/api/dashboard/stats`, { headers });
        console.log('✅ Stats Status:', statsResponse.status);
        console.log('✅ Stats Data:', JSON.stringify(statsResponse.data, null, 2));
        
        // Test 3: Users endpoint
        console.log('\n3. Testing Users Endpoint...');
        const usersResponse = await axios.get(`${API_BASE}/api/users`, { headers });
        console.log('✅ Users Status:', usersResponse.status);
        console.log('✅ Users Data:', JSON.stringify(usersResponse.data, null, 2));
        
        // Test 4: Leads endpoint
        console.log('\n4. Testing Leads Endpoint...');
        const leadsResponse = await axios.get(`${API_BASE}/api/leads`, { headers });
        console.log('✅ Leads Status:', leadsResponse.status);
        console.log('✅ Leads Data:', JSON.stringify(leadsResponse.data, null, 2));
        
        // Test 5: Test Add User
        console.log('\n5. Testing Add User...');
        const newUser = {
            name: 'Test User',
            username: 'testuser',
            email: 'test@dmhca.in',
            role: 'counselor',
            department: 'Testing',
            status: 'active',
            assignedTo: 'santhosh@dmhca.in'
        };
        
        const createResponse = await axios.post(`${API_BASE}/api/users`, newUser, { headers });
        console.log('✅ Create User Status:', createResponse.status);
        console.log('✅ Create User Response:', JSON.stringify(createResponse.data, null, 2));
        
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

testRealDataEndpoints().then(() => {
    console.log('\n🎯 Real data endpoint test completed!');
}).catch(console.error);