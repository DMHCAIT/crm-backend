// Analytics Event Tracking API
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

let supabase;
try {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
  }
} catch (error) {
  console.log('Analytics Tracking: Supabase initialization failed:', error.message);
}

const JWT_SECRET = process.env.JWT_SECRET || 'dmhca-crm-super-secret-production-key-2024';

function verifyToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No valid token provided');
  }
  
  const token = authHeader.substring(7);
  return jwt.verify(token, JWT_SECRET);
}

module.exports = async (req, res) => {
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
    return res.status(200).end();
  }

  if (!supabase) {
    return res.status(500).json({
      success: false,
      error: 'Database connection not available'
    });
  }

  try {
    const user = verifyToken(req);

    if (req.method === 'POST') {
      // Track a new event
      const {
        event_type,
        lead_id,
        student_id,
        duration_seconds,
        metadata = {}
      } = req.body;

      if (!event_type) {
        return res.status(400).json({
          success: false,
          error: 'event_type is required'
        });
      }

      const { data, error } = await supabase
        .from('analytics_events')
        .insert({
          event_type,
          user_id: user.userId,
          lead_id,
          student_id,
          duration_seconds,
          metadata,
          event_timestamp: new Date().toISOString(),
          ip_address: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
          user_agent: req.headers['user-agent']
        })
        .select()
        .single();

      if (error) throw error;

      return res.status(201).json({
        success: true,
        data
      });
    }

    if (req.method === 'GET') {
      // Get events with optional filtering
      const { 
        event_type, 
        lead_id, 
        user_id,
        start_date,
        end_date,
        limit = 100 
      } = req.query;

      let query = supabase
        .from('analytics_events')
        .select('*')
        .order('event_timestamp', { ascending: false })
        .limit(parseInt(limit));

      if (event_type) query = query.eq('event_type', event_type);
      if (lead_id) query = query.eq('lead_id', lead_id);
      if (user_id) query = query.eq('user_id', user_id);
      if (start_date) query = query.gte('event_timestamp', start_date);
      if (end_date) query = query.lte('event_timestamp', end_date);

      const { data, error } = await query;

      if (error) throw error;

      return res.status(200).json({
        success: true,
        data,
        count: data.length
      });
    }

    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });

  } catch (error) {
    console.error('Analytics tracking error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
