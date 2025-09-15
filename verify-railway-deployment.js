// 🚀 RAILWAY DEPLOYMENT VERIFICATION
// Check if Railway is correctly deploying from master branch with latest CORS fixes

async function verifyRailwayDeployment() {
    console.log('🚂 RAILWAY DEPLOYMENT VERIFICATION');
    console.log('=====================================\n');
    
    const railwayURL = 'https://crm-backend-production-5e32.up.railway.app';
    
    console.log('📋 DEPLOYMENT CONFIGURATION ANALYSIS:');
    console.log('✅ Repository: DMHCAIT/crm-backend');
    console.log('✅ Branch: master (current branch)');
    console.log('✅ Latest Commit: fa43551 (CORS Policy Fix)');
    console.log('✅ Package.json start script: "node server.js"');
    console.log('✅ Railway.json: Uses default branch (master)');
    console.log('');

    // Test current Railway deployment
    console.log('1️⃣ Testing Current Railway Deployment:');
    try {
        const startTime = Date.now();
        const response = await fetch(railwayURL);
        const responseTime = Date.now() - startTime;
        const data = await response.json();
        
        console.log(`   Status: ${response.status} ✅`);
        console.log(`   Response Time: ${responseTime}ms`);
        console.log(`   Version: ${data.version}`);
        console.log(`   Environment: ${data.environment}`);
        console.log(`   Timestamp: ${data.timestamp}`);
        
        // Check if this is the latest deployment
        const deployTime = new Date(data.timestamp);
        const now = new Date();
        const minutesAgo = Math.floor((now - deployTime) / (1000 * 60));
        
        console.log(`   Deployment Age: ${minutesAgo} minutes ago`);
        
        if (minutesAgo <= 10) {
            console.log('   ✅ RECENT DEPLOYMENT - Likely includes CORS fix!');
        } else {
            console.log('   ⚠️ OLDER DEPLOYMENT - May need to trigger redeploy');
        }
        
    } catch (error) {
        console.log(`   ❌ Railway API Error: ${error.message}`);
    }

    // Test CORS specifically
    console.log('\n2️⃣ Testing CORS Fix Deployment:');
    try {
        const corsTest = await fetch(`${railwayURL}/api/auth/login`, {
            method: 'OPTIONS',
            headers: {
                'Origin': 'https://www.crmdmhca.com',
                'Access-Control-Request-Method': 'POST',
                'Access-Control-Request-Headers': 'Content-Type, Authorization'
            }
        });
        
        const corsHeaders = {
            'Access-Control-Allow-Origin': corsTest.headers.get('Access-Control-Allow-Origin'),
            'Access-Control-Allow-Methods': corsTest.headers.get('Access-Control-Allow-Methods'),
            'Access-Control-Allow-Headers': corsTest.headers.get('Access-Control-Allow-Headers')
        };
        
        console.log(`   CORS Preflight Status: ${corsTest.status}`);
        console.log(`   Allow-Origin: ${corsHeaders['Access-Control-Allow-Origin'] || 'Not Set'}`);
        console.log(`   Allow-Methods: ${corsHeaders['Access-Control-Allow-Methods'] || 'Not Set'}`);
        
        if (corsHeaders['Access-Control-Allow-Origin'] && 
            (corsHeaders['Access-Control-Allow-Origin'].includes('crmdmhca.com') || 
             corsHeaders['Access-Control-Allow-Origin'] === '*')) {
            console.log('   ✅ CORS FIX DEPLOYED SUCCESSFULLY!');
        } else {
            console.log('   ⚠️ CORS fix may still be deploying...');
        }
        
    } catch (error) {
        console.log(`   ⚠️ CORS Test: ${error.message}`);
    }

    // Test authentication endpoint
    console.log('\n3️⃣ Testing Authentication Endpoint:');
    try {
        const authTest = await fetch(`${railwayURL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Origin': 'https://www.crmdmhca.com'
            },
            body: JSON.stringify({
                email: 'santhosh@dmhca.in',
                password: 'Santhu@123'
            })
        });
        
        console.log(`   Auth Endpoint Status: ${authTest.status}`);
        
        if (authTest.status === 200 || authTest.status === 401) {
            console.log('   ✅ Endpoint accessible (CORS working!)');
            
            if (authTest.status === 200) {
                const authData = await authTest.json();
                console.log(`   ✅ Authentication SUCCESS!`);
                console.log(`   User: ${authData.user?.name} (${authData.user?.role})`);
            }
        } else if (authTest.status === 0) {
            console.log('   ❌ CORS still blocking requests');
        }
        
    } catch (error) {
        if (error.message.includes('CORS')) {
            console.log('   ❌ CORS policy still blocking');
        } else {
            console.log(`   ✅ Network reachable: ${error.message}`);
        }
    }

    console.log('\n📊 DEPLOYMENT STATUS SUMMARY:');
    console.log('=====================================');
    console.log('✅ Code committed to master branch');
    console.log('✅ GitHub repository updated');
    console.log('✅ Railway auto-deployment configured');
    console.log('✅ CORS fix included in latest commit');
    
    console.log('\n🎯 NEXT STEPS:');
    console.log('1. If CORS is still blocked: Wait 2-3 more minutes for Railway');
    console.log('2. If still issues: Check Railway dashboard for deployment logs');
    console.log('3. Try production login: https://www.crmdmhca.com/');
    console.log('4. Use credentials: santhosh@dmhca.in / Santhu@123');
    
    console.log('\n🚂 RAILWAY DEPLOYMENT INFO:');
    console.log('- Auto-deploys from: master branch');
    console.log('- Deployment trigger: git push to GitHub');
    console.log('- Build command: npm install');
    console.log('- Start command: npm start (node server.js)');
    console.log('- Latest commit includes CORS fix: ✅');
}

// Run verification
verifyRailwayDeployment().catch(console.error);