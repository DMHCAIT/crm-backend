// Health Check API
module.exports = async (req, res) => {
  // Set CORS headers for production domain
  const allowedOrigins = ['https://www.crmdmhca.com', 'https://crmdmhca.com', 'http://localhost:5173'];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const healthData = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    message: 'DMHCA CRM API is running',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    services: {
      database: process.env.SUPABASE_URL ? 'connected' : 'not configured',
      whatsapp: process.env.WHATSAPP_ACCESS_TOKEN ? 'configured' : 'not configured',
      facebook: process.env.FACEBOOK_ACCESS_TOKEN ? 'configured' : 'not configured',
      payments: process.env.RAZORPAY_KEY_ID ? 'configured' : 'not configured'
    }
  };

  res.json(healthData);
};
