const axios = require('axios');

const API_BASE = 'https://crm-backend-production-5e32.up.railway.app';

console.log('🔍 USER MANAGEMENT WORKFLOW TEST');
console.log('=================================');
console.log('');

async function testUserWorkflow() {
  try {
    // Test 1: Login to get authentication token
    console.log('1. 📝 Testing Login to get authentication token...');
    
    const loginResponse = await axios.post(`${API_BASE}/api/auth/login`, {
      email: 'santhosh@dmhca.edu',
      password: 'admin123'
    });
    
    if (!loginResponse.data.success) {
      throw new Error('Login failed');
    }
    
    const token = loginResponse.data.token;
    console.log('   ✅ Login successful, got token');
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    // Test 2: Create a new user
    console.log('\n2. 👤 Testing User Creation...');
    
    const newUser = {
      name: 'Test User ' + Date.now(),
      username: 'testuser' + Date.now(),
      email: `testuser${Date.now()}@test.com`,
      password: 'testpass123',
      phone: '9999999999',
      role: 'counselor',
      department: 'sales',
      status: 'active',
      branch: 'Delhi'
    };
    
    console.log('   📤 Sending user data:', JSON.stringify(newUser, null, 2));
    
    const createResponse = await axios.post(`${API_BASE}/api/users`, newUser, { headers });
    
    console.log('   📥 Create response status:', createResponse.status);
    console.log('   📥 Create response data:', JSON.stringify(createResponse.data, null, 2));
    
    if (!createResponse.data.success) {
      throw new Error(`User creation failed: ${createResponse.data.error}`);
    }
    
    const createdUser = createResponse.data.user;
    console.log('   ✅ User created successfully!');
    console.log('   📋 Created user ID:', createdUser.id);
    console.log('   🔒 Password hash in DB:', createdUser.password_hash ? 'Present' : 'Missing');
    
    // Test 3: Try to update the user
    console.log('\n3. ✏️ Testing User Update...');
    
    const updateData = {
      name: 'Updated Test User',
      phone: '8888888888',
      password: 'newpassword123'
    };
    
    console.log('   📤 Sending update data:', JSON.stringify(updateData, null, 2));
    
    const updateResponse = await axios.put(`${API_BASE}/api/users?id=${createdUser.id}`, updateData, { headers });
    
    console.log('   📥 Update response status:', updateResponse.status);
    console.log('   📥 Update response data:', JSON.stringify(updateResponse.data, null, 2));
    
    if (!updateResponse.data.success) {
      throw new Error(`User update failed: ${updateResponse.data.error}`);
    }
    
    console.log('   ✅ User updated successfully!');
    
    // Test 4: Try to login with the new user
    console.log('\n4. 🔐 Testing Login with New User...');
    
    try {
      const newUserLogin = await axios.post(`${API_BASE}/api/auth/login`, {
        email: newUser.email,
        password: 'newpassword123' // Updated password
      });
      
      if (newUserLogin.data.success) {
        console.log('   ✅ New user can login with updated password!');
      } else {
        console.log('   ❌ New user login failed with updated password');
      }
    } catch (loginError) {
      console.log('   ❌ New user login error:', loginError.response?.data?.message || loginError.message);
    }
    
    // Test 5: Check if we can fetch users list
    console.log('\n5. 📋 Testing Users List...');
    
    const usersResponse = await axios.get(`${API_BASE}/api/users`, { headers });
    console.log('   📥 Users list status:', usersResponse.status);
    console.log('   📊 Number of users:', usersResponse.data.length || 'Unknown');
    
    console.log('\n🎉 WORKFLOW TEST COMPLETE!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

async function diagnosePasswordIssue() {
  console.log('\n🔍 DIAGNOSING PASSWORD STORAGE ISSUE');
  console.log('====================================');
  
  console.log('\n📝 EXPECTED WORKFLOW:');
  console.log('1. Frontend sends user data with password to POST /api/users');
  console.log('2. Backend receives data and hashes password with bcrypt');
  console.log('3. Backend stores hashed password in database');
  console.log('4. User can login with original password');
  
  console.log('\n🔍 POSSIBLE ISSUES:');
  console.log('1. Backend not receiving password field');
  console.log('2. Password hashing not working');
  console.log('3. Database not saving password_hash field');
  console.log('4. Frontend not sending password field');
  
  console.log('\n🛠️ DEBUGGING STEPS:');
  console.log('1. Check server logs during user creation');
  console.log('2. Verify password field is in request body');
  console.log('3. Confirm bcrypt hashing is working');
  console.log('4. Check database record has password_hash');
}

// Run the tests
testUserWorkflow().then(() => {
  diagnosePasswordIssue();
});