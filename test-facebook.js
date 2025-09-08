const axios = require('axios');
require('dotenv').config();

console.log('🔍 Testing Facebook API Integration...');
console.log('====================================');

const FACEBOOK_ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN;
const FACEBOOK_PAGE_ID = process.env.FACEBOOK_PAGE_ID;

async function testFacebookToken() {
  try {
    console.log('Token provided:', FACEBOOK_ACCESS_TOKEN ? '✅ Yes' : '❌ No');
    console.log('Page ID provided:', FACEBOOK_PAGE_ID ? '✅ Yes' : '❌ No');
    console.log('Page ID:', FACEBOOK_PAGE_ID || 'Not set');
    console.log('Token length:', FACEBOOK_ACCESS_TOKEN ? FACEBOOK_ACCESS_TOKEN.length : 0);
    console.log('');

    if (!FACEBOOK_ACCESS_TOKEN) {
      console.log('❌ No Facebook access token found in .env file');
      return false;
    }

    // Test 1: Get token info
    console.log('🔍 Testing token validity...');
    const tokenResponse = await axios.get(
      `https://graph.facebook.com/me?access_token=${FACEBOOK_ACCESS_TOKEN}`
    );

    console.log('✅ Token is valid!');
    console.log('Connected to:', tokenResponse.data.name);
    console.log('User ID:', tokenResponse.data.id);
    console.log('');

    // Test 2: Get pages
    console.log('📄 Getting available pages...');
    const pagesResponse = await axios.get(
      `https://graph.facebook.com/me/accounts?access_token=${FACEBOOK_ACCESS_TOKEN}`
    );

    console.log('✅ Pages retrieved successfully!');
    console.log('Number of pages:', pagesResponse.data.data.length);
    
    if (pagesResponse.data.data.length > 0) {
      console.log('\n📋 Available Pages:');
      pagesResponse.data.data.forEach((page, index) => {
        console.log(`${index + 1}. ${page.name} (ID: ${page.id})`);
      });

      // Suggest the first page ID for configuration
      const firstPageId = pagesResponse.data.data[0].id;
      console.log(`\n💡 Suggested Page ID for .env: ${firstPageId}`);
      
      // Check if configured page ID matches available pages
      if (FACEBOOK_PAGE_ID) {
        const configuredPage = pagesResponse.data.data.find(page => page.id === FACEBOOK_PAGE_ID);
        if (configuredPage) {
          console.log(`✅ Configured Page ID matches: ${configuredPage.name}`);
        } else {
          console.log(`⚠️ Configured Page ID (${FACEBOOK_PAGE_ID}) not found in available pages`);
        }
      }
    }

    // Test 3: Check permissions
    console.log('\n🔐 Checking permissions...');
    const permissionsResponse = await axios.get(
      `https://graph.facebook.com/me/permissions?access_token=${FACEBOOK_ACCESS_TOKEN}`
    );

    const permissions = permissionsResponse.data.data.map(p => p.permission);
    console.log('✅ Permissions retrieved!');
    console.log('Active permissions:', permissions.join(', '));

    // Check for required permissions
    const requiredPerms = ['leads_retrieval', 'pages_show_list', 'pages_manage_metadata'];
    const hasRequired = requiredPerms.every(perm => permissions.includes(perm));
    
    if (hasRequired) {
      console.log('✅ All required permissions are granted!');
    } else {
      console.log('⚠️ Some required permissions may be missing:');
      requiredPerms.forEach(perm => {
        console.log(`  ${permissions.includes(perm) ? '✅' : '❌'} ${perm}`);
      });
    }

    console.log('\n🎯 FACEBOOK API TEST COMPLETE');
    console.log('====================================');
    return true;

  } catch (error) {
    console.log('❌ Facebook API test failed:');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Error:', error.response.data);
    } else {
      console.log('Error:', error.message);
    }
    return false;
  }
}

// Run the test
testFacebookToken().then(success => {
  if (success) {
    console.log('\n🟢 Facebook integration is working properly!');
    console.log('🔄 Ready to receive Facebook lead ads!');
  } else {
    console.log('\n🔴 Facebook integration needs attention!');
  }
});
