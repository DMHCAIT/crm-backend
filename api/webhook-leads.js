// 📥 Webhook endpoint for website leads
const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger');


const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const WEBHOOK_VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN || 'your-verify-token';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

module.exports = async (req, res) => {
  // Allow only POST
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  // CORS headers
  const origin = req.headers.origin;
  
  // Allow specific origins
  const allowedOrigins = [
    'https://www.dmhbmct.net',
    'https://dmhbmct.net',
    'https://www.crmdmhca.com',
    'https://crmdmhca.com',
    'http://localhost:3000',
    'http://localhost:5173'
  ];
  
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Origin');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { token, lead } = req.body;

  // Verify token
  if (!token || token !== WEBHOOK_VERIFY_TOKEN) {
    return res.status(401).json({ success: false, message: 'Invalid or missing verify token' });
  }

  // Validate lead data (customize fields as needed)
  if (!lead || !lead.name || !lead.email) {
    return res.status(400).json({ success: false, message: 'Missing required lead fields' });
  }

  // Insert lead into Supabase
  const { data, error } = await supabase
    .from('leads')
    .insert({
      name: lead.name,
      email: lead.email,
      phone: lead.phone || null,
      source: 'website',
      status: 'fresh',
      created_at: new Date().toISOString(),
      ...lead // include any extra fields
    })
    .select()
    .single();

  if (error) {
    return res.status(500).json({ success: false, message: 'Failed to add lead', error: error.message });
  }

  return res.json({ success: true, message: 'Lead added successfully', lead: data });
};
