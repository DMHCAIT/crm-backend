const axios = require('axios');

// Test local server
async function testLocalLeads() {
    console.log('🔍 Testing Local Lead Server...\n');
    
    try {
        // Test 1: Health check
        console.log('1. Testing Health Endpoint...');
        const healthResponse = await axios.get('http://localhost:3001/api/health');
        console.log('✅ Health:', healthResponse.data);
        
        // Test 2: Leads endpoint
        console.log('\n2. Testing Leads Endpoint...');
        const leadsResponse = await axios.get('http://localhost:3001/api/leads');
        console.log('✅ Leads Response:', leadsResponse.data);
        
        if (leadsResponse.data.data && leadsResponse.data.data.length > 0) {
            console.log('✅ Sample Lead:', JSON.stringify(leadsResponse.data.data[0], null, 2));
        } else {
            console.log('⚠️ No leads found - database might be empty');
        }
        
    } catch (error) {
        console.log('❌ Error:', error.message);
        if (error.response) {
            console.log('Status:', error.response.status);
            console.log('Data:', error.response.data);
        }
    }
}

testLocalLeads();