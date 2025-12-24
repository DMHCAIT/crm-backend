// Facebook Lead Ads Webhook
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger');


// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

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

  if (req.method === 'GET') {
    // Webhook verification
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === process.env.FACEBOOK_VERIFY_TOKEN) {
      logger.info('Facebook webhook verified');
      res.status(200).send(challenge);
    } else {
      res.status(403).send('Forbidden');
    }
    return;
  }

  if (req.method === 'POST') {
    try {
      const { object, entry } = req.body;

      if (object === 'page') {
        for (const pageEntry of entry) {
          if (pageEntry.changes) {
            for (const change of pageEntry.changes) {
              if (change.field === 'leadgen') {
                const leadgenId = change.value.leadgen_id;
                await processFacebookLead(leadgenId);
              }
            }
          }
        }
      }

      res.status(200).send('OK');
    } catch (error) {
      logger.error('Facebook webhook error:', error);
      res.status(500).send('Error');
    }
  }
};

async function processFacebookLead(leadgenId) {
  if (!process.env.FACEBOOK_ACCESS_TOKEN) {
    logger.info('Facebook not configured, skipping lead processing');
    return;
  }

  try {
    const response = await axios.get(
      `https://graph.facebook.com/v17.0/${leadgenId}?fields=field_data`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.FACEBOOK_ACCESS_TOKEN}`
        }
      }
    );

    const fieldData = response.data.field_data;
    const leadData = {};

    fieldData.forEach(field => {
      leadData[field.name] = field.values[0];
    });

    // Save to database
    const { data: lead, error } = await supabase
      .from('leads')
      .insert([{
        name: leadData.full_name || leadData.name,
        email: leadData.email,
        phone: leadData.phone_number,
        source: 'facebook_ads',
        status: 'Fresh',
        score: 60,
        notes: `Facebook Lead Ad: ${leadData.course_interest || 'General inquiry'}`
      }])
      .select()
      .single();

    if (error) throw error;

    logger.info('Facebook lead processed:', lead.id);

  } catch (error) {
    logger.error('Facebook lead processing error:', error);
  }
}
