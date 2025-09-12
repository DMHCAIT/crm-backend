// Railway Deployment Diagnostic Script
// This script helps identify common Railway + Supabase deployment issues

// Load environment variables
require('dotenv').config();

console.log('🔍 RAILWAY + SUPABASE DEPLOYMENT DIAGNOSTICS');
console.log('=' .repeat(60));

// Check environment variables
console.log('\n📋 Environment Variables Check:');
console.log('NODE_ENV:', process.env.NODE_ENV || 'Not set');
console.log('PORT:', process.env.PORT || 'Not set');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Set' : '❌ Missing');
console.log('SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? '✅ Set (length: ' + process.env.SUPABASE_SERVICE_KEY?.length + ')' : '❌ Missing');
console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? '✅ Set' : '⚠️  Not set (optional)');

// Test Supabase connection
console.log('\n🗄️  Database Connection Test:');
try {
    const { createClient } = require('@supabase/supabase-js');
    
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_KEY
        );
        console.log('✅ Supabase client created successfully');
        
        // Test a simple query
        supabase.from('users').select('count', { count: 'exact', head: true })
            .then(({ count, error }) => {
                if (error) {
                    console.log('❌ Database query failed:', error.message);
                } else {
                    console.log('✅ Database connection successful, users count:', count);
                }
            })
            .catch(err => {
                console.log('❌ Database connection error:', err.message);
            });
            
    } else {
        console.log('❌ Cannot test database - credentials missing');
    }
} catch (error) {
    console.log('❌ Supabase initialization failed:', error.message);
}

// Check package dependencies
console.log('\n📦 Dependencies Check:');
try {
    require('@supabase/supabase-js');
    console.log('✅ @supabase/supabase-js installed');
} catch (e) {
    console.log('❌ @supabase/supabase-js missing');
}

try {
    require('express');
    console.log('✅ express installed');
} catch (e) {
    console.log('❌ express missing');
}

try {
    require('cors');
    console.log('✅ cors installed');
} catch (e) {
    console.log('❌ cors missing');
}

// Railway-specific checks
console.log('\n🚂 Railway Environment:');
console.log('RAILWAY_STATIC_URL:', process.env.RAILWAY_STATIC_URL || 'Not set');
console.log('RAILWAY_GIT_COMMIT_SHA:', process.env.RAILWAY_GIT_COMMIT_SHA || 'Not set');

// Provide recommendations
console.log('\n💡 RECOMMENDATIONS:');
console.log('1. Ensure SUPABASE_URL and SUPABASE_SERVICE_KEY are set in Railway dashboard');
console.log('2. Check Railway deployment logs for specific error messages');
console.log('3. Verify Supabase project is active and credentials are correct');
console.log('4. Make sure all npm dependencies are installed');

console.log('\n🏁 Diagnostic complete!');
console.log('If issues persist, check Railway logs and Supabase dashboard.');
