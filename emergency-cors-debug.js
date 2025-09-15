// 🚨 EMERGENCY CORS DEBUG - Real browser simulation test

async function emergencyCORSDebug() {
    console.log('🚨 EMERGENCY CORS DEBUG TEST');
    console.log('=============================\n');
    
    const railwayURL = 'https://crm-backend-production-5e32.up.railway.app';
    
    // Test 1: Simulate exact browser preflight request
    console.log('1️⃣ Simulating EXACT Browser Preflight Request:');
    try {
        const preflightResponse = await fetch(`${railwayURL}/api/auth/login`, {
            method: 'OPTIONS',
            headers: {
                'Origin': 'https://www.crmdmhca.com',
                'Access-Control-Request-Method': 'POST',
                'Access-Control-Request-Headers': 'content-type'
            }
        });
        
        console.log(`   Preflight Status: ${preflightResponse.status}`);
        console.log('   Response Headers:');
        
        // Check all CORS headers
        const headers = [
            'Access-Control-Allow-Origin',
            'Access-Control-Allow-Methods', 
            'Access-Control-Allow-Headers',
            'Access-Control-Allow-Credentials'
        ];
        
        headers.forEach(header => {
            const value = preflightResponse.headers.get(header);
            console.log(`   - ${header}: ${value || 'NOT SET ❌'}`);
        });
        
        // Check if origin is allowed
        const allowOrigin = preflightResponse.headers.get('Access-Control-Allow-Origin');
        if (allowOrigin === 'https://www.crmdmhca.com' || allowOrigin === '*') {
            console.log('   ✅ Origin correctly allowed');
        } else {
            console.log('   ❌ Origin NOT allowed - PROBLEM FOUND!');
        }
        
    } catch (error) {
        console.log(`   ❌ Preflight Failed: ${error.message}`);
    }

    // Test 2: Check server root for CORS
    console.log('\n2️⃣ Testing Root Endpoint CORS:');
    try {
        const rootResponse = await fetch(railwayURL, {
            method: 'GET',
            headers: {
                'Origin': 'https://www.crmdmhca.com'
            }
        });
        
        console.log(`   Root Status: ${rootResponse.status}`);
        console.log(`   Allow-Origin: ${rootResponse.headers.get('Access-Control-Allow-Origin') || 'NOT SET'}`);
        
    } catch (error) {
        console.log(`   Root Test Failed: ${error.message}`);
    }

    // Test 3: Check what happens with POST to login
    console.log('\n3️⃣ Testing Actual POST Request:');
    try {
        const postResponse = await fetch(`${railwayURL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Origin': 'https://www.crmdmhca.com'
            },
            body: JSON.stringify({
                email: 'test@test.com',
                password: 'test123'
            })
        });
        
        console.log(`   POST Status: ${postResponse.status}`);
        console.log(`   POST Allow-Origin: ${postResponse.headers.get('Access-Control-Allow-Origin') || 'NOT SET'}`);
        
    } catch (error) {
        console.log(`   POST Test: ${error.message}`);
    }

    console.log('\n📋 DIAGNOSIS:');
    console.log('If "Access-Control-Allow-Origin: NOT SET" appears above,');
    console.log('then the CORS middleware is not working correctly.');
    console.log('\n🔧 SOLUTION NEEDED:');
    console.log('- Fix CORS middleware configuration');
    console.log('- Ensure origin validation works properly');
    console.log('- Add fallback CORS headers');
}

// Run emergency debug
emergencyCORSDebug().catch(console.error);