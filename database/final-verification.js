const axios = require('axios');

const BASE_URL = 'https://crm-backend-production-5e32.up.railway.app';

async function testEndpoint(endpoint, description) {
    try {
        console.log(`\n📋 Testing: ${description}`);
        console.log(`🌐 URL: ${BASE_URL}${endpoint}`);
        
        const response = await axios.get(`${BASE_URL}${endpoint}`, {
            timeout: 10000
        });
        
        console.log(`✅ Status: ${response.status}`);
        console.log(`📊 Response:`, JSON.stringify(response.data, null, 2));
        return { success: true, status: response.status, data: response.data };
        
    } catch (error) {
        if (error.response) {
            console.log(`❌ Status: ${error.response.status}`);
            console.log(`📊 Error:`, JSON.stringify(error.response.data, null, 2));
            return { success: false, status: error.response.status, error: error.response.data };
        } else {
            console.log(`❌ Network Error:`, error.message);
            return { success: false, error: error.message };
        }
    }
}

async function comprehensiveVerification() {
    console.log('🔍 COMPREHENSIVE DATABASE & API VERIFICATION');
    console.log('=' .repeat(60));
    
    const testResults = {};
    
    // Test endpoints
    const endpoints = [
        { path: '/health', desc: 'Health Check' },
        { path: '/api/users', desc: 'Users API' },
        { path: '/api/leads', desc: 'Leads API' },
        { path: '/api/students', desc: 'Students API' },
        { path: '/api/communications', desc: 'Communications API' },
        { path: '/api/documents', desc: 'Documents API' },
        { path: '/api/analytics/realtime', desc: 'Analytics API (Real-time)' },
        { path: '/api/dashboard/stats', desc: 'Dashboard API' }
    ];
    
    for (const endpoint of endpoints) {
        testResults[endpoint.path] = await testEndpoint(endpoint.path, endpoint.desc);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between requests
    }
    
    // Summary
    console.log('\n' + '=' .repeat(60));
    console.log('📊 FINAL VERIFICATION SUMMARY');
    console.log('=' .repeat(60));
    
    const working = [];
    const broken = [];
    
    for (const [endpoint, result] of Object.entries(testResults)) {
        if (result.success) {
            working.push(endpoint);
            console.log(`✅ ${endpoint} - Working (${result.status})`);
        } else {
            broken.push(endpoint);
            console.log(`❌ ${endpoint} - Failed (${result.status || 'Network Error'})`);
        }
    }
    
    console.log(`\n📈 Results: ${working.length} working, ${broken.length} broken`);
    
    if (working.length > 0) {
        console.log('\n🟢 Working Endpoints:');
        working.forEach(endpoint => console.log(`   ${endpoint}`));
    }
    
    if (broken.length > 0) {
        console.log('\n🔴 Broken Endpoints:');
        broken.forEach(endpoint => console.log(`   ${endpoint}`));
    }
    
    // Database Status Assessment
    console.log('\n🗄️  DATABASE STATUS ASSESSMENT:');
    if (testResults['/api/users']?.success) {
        console.log('✅ Users table appears to be working');
    } else {
        console.log('❌ Users table may need creation or has issues');
    }
    
    if (testResults['/api/leads']?.success) {
        console.log('✅ Leads table appears to be working');
    } else {
        console.log('❌ Leads table may need creation or has issues');
    }
    
    if (testResults['/api/students']?.success) {
        console.log('✅ Students table appears to be working');
    } else {
        console.log('❌ Students table may need creation or has issues');
    }
    
    // Recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    if (broken.length === 0) {
        console.log('🎉 All endpoints are working! Database appears to be properly set up.');
    } else {
        console.log('⚠️  Some endpoints need attention:');
        
        if (broken.includes('/api/analytics/realtime')) {
            console.log('   • Analytics endpoint needs deployment of updated code');
        }
        
        if (broken.some(e => e.includes('/api/students') || e.includes('/api/communications') || e.includes('/api/documents'))) {
            console.log('   • Some data tables may need to be created in Supabase');
            console.log('   • Run database creation scripts: node database/setup.js');
        }
        
        console.log('   • Verify Supabase environment variables are correctly set');
        console.log('   • Check Railway deployment logs for specific errors');
    }
    
    console.log('\n🏁 Verification Complete!');
}

// Run verification
comprehensiveVerification().catch(console.error);
