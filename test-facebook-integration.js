// 🧪 Facebook Lead Ads Integration Test Script
// Run this to test your Facebook API setup and lead retrieval

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🔗 FACEBOOK LEAD ADS INTEGRATION TEST');
console.log('====================================\n');

// Test configuration
function testConfiguration() {
  console.log('📋 Checking Facebook API Configuration...\n');
  
  const requiredEnvs = [
    'FACEBOOK_APP_ID',
    'FACEBOOK_APP_SECRET', 
    'FACEBOOK_ACCESS_TOKEN',
    'FACEBOOK_PAGE_ID',
    'FACEBOOK_AD_ACCOUNT_ID'
  ];

  let allConfigured = true;

  requiredEnvs.forEach(env => {
    const value = process.env[env];
    if (value) {
      console.log(`✅ ${env}: Configured (${value.substring(0, 10)}...)`);
    } else {
      console.log(`❌ ${env}: Missing`);
      allConfigured = false;
    }
  });

  console.log('\n' + '='.repeat(50));
  
  if (allConfigured) {
    console.log('✅ All Facebook API credentials are configured!');
    return true;
  } else {
    console.log('❌ Missing required Facebook API credentials.');
    console.log('\n📝 Please add the missing environment variables to your .env file:');
    console.log('   See FACEBOOK_INTEGRATION_GUIDE.md for setup instructions');
    return false;
  }
}

// Test Facebook API connection
async function testFacebookAPI() {
  console.log('\n🔍 Testing Facebook API Connection...\n');

  const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
  const pageId = process.env.FACEBOOK_PAGE_ID;

  if (!accessToken || !pageId) {
    console.log('❌ Cannot test API - missing access token or page ID');
    return false;
  }

  try {
    // Test basic API access
    console.log('📡 Testing API access...');
    const response = await fetch(`https://graph.facebook.com/v18.0/me?access_token=${accessToken}`);
    const data = await response.json();

    if (data.error) {
      console.log('❌ API Error:', data.error.message);
      return false;
    }

    console.log('✅ API Connection successful!');
    console.log(`   Connected as: ${data.name}`);

    // Test page access
    console.log('\n📄 Testing page access...');
    const pageResponse = await fetch(`https://graph.facebook.com/v18.0/${pageId}?access_token=${accessToken}&fields=name,id`);
    const pageData = await pageResponse.json();

    if (pageData.error) {
      console.log('❌ Page Access Error:', pageData.error.message);
      return false;
    }

    console.log('✅ Page access successful!');
    console.log(`   Page: ${pageData.name} (${pageData.id})`);

    // Test lead forms access
    console.log('\n📋 Testing lead forms access...');
    const formsResponse = await fetch(`https://graph.facebook.com/v18.0/${pageId}/leadgen_forms?access_token=${accessToken}&fields=id,name,status,leads_count`);
    const formsData = await formsResponse.json();

    if (formsData.error) {
      console.log('❌ Lead Forms Error:', formsData.error.message);
      return false;
    }

    const forms = formsData.data || [];
    console.log(`✅ Found ${forms.length} lead forms:`);
    
    if (forms.length === 0) {
      console.log('   📝 No lead forms found. Create a lead ad to test lead retrieval.');
    } else {
      forms.forEach((form, index) => {
        console.log(`   ${index + 1}. ${form.name} (${form.leads_count || 0} leads)`);
      });
    }

    return true;

  } catch (error) {
    console.log('❌ Connection failed:', error.message);
    return false;
  }
}

// Test lead retrieval
async function testLeadRetrieval() {
  console.log('\n📥 Testing Lead Retrieval...\n');

  try {
    console.log('🔄 Making request to CRM Facebook leads API...');
    
    // Test local API endpoint
    const baseUrl = process.env.API_BASE_URL || 'http://localhost:3001';
    const response = await fetch(`${baseUrl}/api/facebook-leads?limit=5`);
    const data = await response.json();

    if (!response.ok) {
      console.log('❌ API Request failed:', data.error || data.message);
      return false;
    }

    console.log('✅ CRM API request successful!');
    console.log(`   Total forms checked: ${data.data?.leadForms?.length || 0}`);
    console.log(`   Leads fetched: ${data.data?.totalFetched || 0}`);
    console.log(`   Leads saved to CRM: ${data.data?.totalSaved || 0}`);

    if (data.data?.totalFetched > 0) {
      console.log('\n📊 Sample lead data:');
      const sampleLead = data.data.leads[0];
      console.log(`   Name: ${sampleLead.fullName}`);
      console.log(`   Email: ${sampleLead.email}`);
      console.log(`   Phone: ${sampleLead.phone}`);
      console.log(`   Source: ${sampleLead.source}`);
    }

    return true;

  } catch (error) {
    console.log('❌ Lead retrieval test failed:', error.message);
    return false;
  }
}

// Test webhook setup
async function testWebhookSetup() {
  console.log('\n🔗 Webhook Setup Information...\n');
  
  const webhookUrl = process.env.FACEBOOK_WEBHOOK_URL || 'https://your-backend.com/api/facebook-leads';
  const verifyToken = process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN || 'dmhca_crm_facebook_webhook_2024';
  
  console.log('📝 Webhook Configuration:');
  console.log(`   Callback URL: ${webhookUrl}`);
  console.log(`   Verify Token: ${verifyToken}`);
  console.log('');
  console.log('🔧 To set up webhooks in Facebook:');
  console.log('   1. Go to your Facebook App → Webhooks');
  console.log('   2. Click "Add Subscription" → "Page"');
  console.log(`   3. Callback URL: ${webhookUrl}`);
  console.log(`   4. Verify Token: ${verifyToken}`);
  console.log('   5. Subscribe to: leadgen');
  
  return true;
}

// Main test runner
async function runTests() {
  console.log('Starting Facebook Lead Ads integration tests...\n');

  const configOk = testConfiguration();
  if (!configOk) {
    process.exit(1);
  }

  const apiOk = await testFacebookAPI();
  if (!apiOk) {
    console.log('\n❌ Facebook API tests failed. Please check your credentials and try again.');
    process.exit(1);
  }

  await testLeadRetrieval();
  await testWebhookSetup();

  console.log('\n' + '='.repeat(50));
  console.log('✅ Facebook Lead Ads integration test completed!');
  console.log('\n🚀 Next Steps:');
  console.log('   1. Create a Facebook lead ad to generate test leads');
  console.log('   2. Set up webhooks for real-time lead sync');
  console.log('   3. Monitor your CRM for incoming Facebook leads');
  console.log('   4. Configure lead assignment and follow-up workflows');
  
  process.exit(0);
}

// Interactive mode
function askForTest() {
  rl.question('\nWhat would you like to test? (config/api/leads/webhook/all/exit): ', (answer) => {
    switch (answer.toLowerCase()) {
      case 'config':
        testConfiguration();
        askForTest();
        break;
      case 'api':
        testFacebookAPI().then(() => askForTest());
        break;
      case 'leads':
        testLeadRetrieval().then(() => askForTest());
        break;
      case 'webhook':
        testWebhookSetup().then(() => askForTest());
        break;
      case 'all':
        runTests();
        break;
      case 'exit':
        console.log('👋 Goodbye!');
        rl.close();
        break;
      default:
        console.log('❓ Invalid option. Please choose: config, api, leads, webhook, all, or exit');
        askForTest();
    }
  });
}

// Check if running in interactive mode
if (require.main === module) {
  if (process.argv.includes('--interactive')) {
    console.log('🎯 Interactive mode - choose individual tests\n');
    askForTest();
  } else {
    console.log('🚀 Running all tests automatically...\n');
    runTests();
  }
}

module.exports = {
  testConfiguration,
  testFacebookAPI,
  testLeadRetrieval,
  testWebhookSetup
};