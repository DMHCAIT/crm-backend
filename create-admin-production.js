// Create Admin User in Production
const axios = require('axios');

async function createAdminInProduction() {
  console.log('Creating admin user in production database...');
  
  const PRODUCTION_URL = 'https://crm-backend-production-5e32.up.railway.app';
  
  try {
    // Create a simple endpoint call to trigger admin creation
    const response = await axios.post(`${PRODUCTION_URL}/create-admin`, {
      adminEmail: 'santhoshapplications@dmhca.in',
      adminPassword: 'Santhu@123',
      adminName: 'santhosh',
      adminUsername: 'santhosh_admin'
    });

    console.log('✓ Admin creation response:', response.data);
    
  } catch (error) {
    if (error.response) {
      console.error('❌ Error response:', error.response.status, error.response.data);
    } else {
      console.error('❌ Error:', error.message);
    }
  }
}

createAdminInProduction();