// Integrations API - Status and testing
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const logger = require('../utils/logger');


// Initialize Supabase conditionally
let supabase;
try {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
  }
} catch (error) {
  logger.info('Integrations module: Supabase initialization failed:', error.message);
}

module.exports = async (req, res) => {
    // Set CORS headers
  const allowedOrigins = [
    'https://www.crmdmhca.com', 
    'https://crmdmhca.com', 
    'https://crm-frontend-dmhca.vercel.app',
    'https://dmhca-crm-frontend.vercel.app',
    'http://localhost:5173'
  ];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin) || (origin && origin.match(/^https:\/\/[\w-]+\.vercel\.app$/))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Handle GET - Get integration status
    if (req.method === 'GET') {
      const integrations = await getIntegrationStatus();
      
      return res.json({
        success: true,
        data: integrations,
        timestamp: new Date().toISOString()
      });
    }

    // Handle POST - Test integrations
    if (req.method === 'POST') {
      const { action, integration } = req.body;

      if (action === 'test') {
        const result = await testIntegration(integration);
        
        return res.json({
          success: true,
          integration,
          result,
          timestamp: new Date().toISOString()
        });
      }

      return res.status(400).json({ error: 'Invalid action' });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    logger.error('Integrations API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
};

// Get status of all integrations
async function getIntegrationStatus() {
  const integrations = [
    {
      name: 'Supabase Database',
      type: 'database',
      status: supabase ? 'connected' : 'disconnected',
      configured: !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY),
      lastChecked: new Date().toISOString()
    },
    {
      name: 'WhatsApp Business API',
      type: 'messaging',
      status: process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_ACCESS_TOKEN !== 'demo_token' ? 'configured' : 'not_configured',
      configured: !!(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_ID),
      lastChecked: new Date().toISOString()
    },
    {
      name: 'Facebook Lead Ads',
      type: 'lead_generation',
      status: process.env.FACEBOOK_ACCESS_TOKEN && process.env.FACEBOOK_ACCESS_TOKEN !== 'demo_token' ? 'configured' : 'not_configured',
      configured: !!(process.env.FACEBOOK_ACCESS_TOKEN && process.env.FACEBOOK_APP_SECRET),
      lastChecked: new Date().toISOString()
    },
    {
      name: 'Razorpay Payment Gateway',
      type: 'payment',
      status: process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_ID !== 'demo_key_id' ? 'configured' : 'not_configured',
      configured: !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
      lastChecked: new Date().toISOString()
    },
    {
      name: 'SendGrid Email Service',
      type: 'email',
      status: process.env.SENDGRID_API_KEY && process.env.SENDGRID_API_KEY !== 'demo_api_key' ? 'configured' : 'not_configured',
      configured: !!(process.env.SENDGRID_API_KEY && process.env.FROM_EMAIL),
      lastChecked: new Date().toISOString()
    }
  ];

  return integrations;
}

// Test specific integration
async function testIntegration(integrationName) {
  try {
    switch (integrationName) {
      case 'supabase':
        return await testSupabase();
      
      case 'whatsapp':
        return await testWhatsApp();
      
      case 'facebook':
        return await testFacebook();
      
      case 'razorpay':
        return await testRazorpay();
      
      case 'sendgrid':
        return await testSendGrid();
      
      default:
        throw new Error('Unknown integration');
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// Individual test functions
async function testSupabase() {
  const { data, error } = await supabase
    .from('leads')
    .select('count')
    .limit(1);
  
  if (error) throw error;
  
  return {
    success: true,
    message: 'Database connection successful',
    timestamp: new Date().toISOString()
  };
}

async function testWhatsApp() {
  if (!process.env.WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN === 'demo_token') {
    throw new Error('WhatsApp access token not configured');
  }

  // Test WhatsApp API connection
  const response = await axios.get(
    `https://graph.facebook.com/v17.0/${process.env.WHATSAPP_PHONE_ID}`,
    {
      headers: {
        'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`
      }
    }
  );

  return {
    success: true,
    message: 'WhatsApp API connection successful',
    data: response.data,
    timestamp: new Date().toISOString()
  };
}

async function testFacebook() {
  if (!process.env.FACEBOOK_ACCESS_TOKEN || process.env.FACEBOOK_ACCESS_TOKEN === 'demo_token') {
    throw new Error('Facebook access token not configured');
  }

  // Test Facebook API connection
  const response = await axios.get(
    `https://graph.facebook.com/me?access_token=${process.env.FACEBOOK_ACCESS_TOKEN}`
  );

  return {
    success: true,
    message: 'Facebook API connection successful',
    data: response.data,
    timestamp: new Date().toISOString()
  };
}

async function testRazorpay() {
  if (!process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID === 'demo_key_id') {
    throw new Error('Razorpay credentials not configured');
  }

  // Test Razorpay API connection
  const response = await axios.get(
    'https://api.razorpay.com/v1/payments',
    {
      auth: {
        username: process.env.RAZORPAY_KEY_ID,
        password: process.env.RAZORPAY_KEY_SECRET
      },
      params: { count: 1 }
    }
  );

  return {
    success: true,
    message: 'Razorpay API connection successful',
    timestamp: new Date().toISOString()
  };
}

async function testSendGrid() {
  if (!process.env.SENDGRID_API_KEY || process.env.SENDGRID_API_KEY === 'demo_api_key') {
    throw new Error('SendGrid API key not configured');
  }

  // Test SendGrid API connection
  const response = await axios.get(
    'https://api.sendgrid.com/v3/user/profile',
    {
      headers: {
        'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`
      }
    }
  );

  return {
    success: true,
    message: 'SendGrid API connection successful',
    data: response.data,
    timestamp: new Date().toISOString()
  };
}
