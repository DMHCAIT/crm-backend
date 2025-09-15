const axios = require('axios');

// Test Railway deployment URLs
const testUrls = [
    'https://crm-backend-production-5e32.up.railway.app',
    'https://crm-backend-main-production.up.railway.app', 
    'https://crm-backend-production.up.railway.app'
];

async function findWorkingRailwayURL() {
    console.log('🔍 Testing Railway deployment URLs...\n');
    
    for (const url of testUrls) {
        try {
            console.log(`Testing: ${url}`);
            
            // Test basic connectivity
            const response = await axios.get(`${url}/api/health`, {
                timeout: 10000
            });
            
            console.log(`✅ ${url} - Status: ${response.status}`);
            console.log(`✅ Response:`, response.data);
            return url;
            
        } catch (error) {
            if (error.response) {
                console.log(`❌ ${url} - Status: ${error.response.status}`);
                console.log(`❌ Data:`, error.response.data);
            } else {
                console.log(`❌ ${url} - Error: ${error.message}`);
            }
        }
        console.log('---');
    }
    
    console.log('\n🔍 No working Railway URL found. Checking if any endpoint responds...');
    
    // Try without /api/health
    for (const url of testUrls) {
        try {
            console.log(`Testing base: ${url}`);
            const response = await axios.get(url, { timeout: 5000 });
            console.log(`✅ ${url} base - Status: ${response.status}`);
            if (response.data) {
                console.log(`✅ Data:`, response.data);
            }
        } catch (error) {
            console.log(`❌ ${url} base - ${error.message}`);
        }
    }
    
    return null;
}

findWorkingRailwayURL().then(workingUrl => {
    if (workingUrl) {
        console.log(`\n🎯 Working URL found: ${workingUrl}`);
    } else {
        console.log('\n⚠️ No working Railway deployment found - may need to redeploy');
    }
}).catch(console.error);