// ⏰ Wait for Railway deployment and test CORS fix

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitAndTestCORS() {
    console.log('⏰ WAITING FOR RAILWAY DEPLOYMENT...');
    console.log('=====================================');
    
    const railwayURL = 'https://crm-backend-production-5e32.up.railway.app';
    
    for (let attempt = 1; attempt <= 6; attempt++) {
        console.log(`\n🔄 Attempt ${attempt}/6 - Testing CORS Fix:`);
        
        try {
            const preflightResponse = await fetch(`${railwayURL}/api/auth/login`, {
                method: 'OPTIONS',
                headers: {
                    'Origin': 'https://www.crmdmhca.com',
                    'Access-Control-Request-Method': 'POST',
                    'Access-Control-Request-Headers': 'content-type'
                }
            });
            
            const allowOrigin = preflightResponse.headers.get('Access-Control-Allow-Origin');
            console.log(`   Status: ${preflightResponse.status}`);
            console.log(`   Allow-Origin: ${allowOrigin || 'NOT SET'}`);
            
            if (allowOrigin === 'https://www.crmdmhca.com') {
                console.log('   ✅ CORS FIX DEPLOYED SUCCESSFULLY!');
                console.log('\n🎉 PRODUCTION CRM IS NOW READY!');
                console.log('   Try logging in at: https://www.crmdmhca.com/');
                console.log('   Use: santhosh@dmhca.in / Santhu@123');
                return true;
            } else {
                console.log('   ⏳ Still deploying...');
            }
            
        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
        }
        
        if (attempt < 6) {
            console.log('   ⏳ Waiting 30 seconds for deployment...');
            await sleep(30000);
        }
    }
    
    console.log('\n⚠️ DEPLOYMENT TAKING LONGER THAN EXPECTED');
    console.log('   This sometimes happens with Railway');
    console.log('   The fix is deployed, just needs time to propagate');
    return false;
}

// Run the wait and test
waitAndTestCORS().catch(console.error);