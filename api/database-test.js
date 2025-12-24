const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger');


// Initialize Supabase
let supabase;
try {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    logger.info('✅ Database Test: Supabase initialized');
  } else {
    logger.info('❌ Database Test: Supabase credentials missing');
  }
} catch (error) {
  logger.info('❌ Database Test: Supabase initialization failed:', error.message);
}

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'authorization,Accept,authorization,content-type,x-requested-with');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    try {
      // Test 1: Check environment variables
      const envTest = {
        hasSupabaseUrl: !!process.env.SUPABASE_URL,
        hasServiceKey: !!process.env.SUPABASE_SERVICE_KEY,
        hasJwtSecret: !!process.env.JWT_SECRET,
        supabaseUrlPrefix: process.env.SUPABASE_URL?.substring(0, 20) + '...',
        nodeEnv: process.env.NODE_ENV
      };

      // Test 2: Check database connection and count leads
      let dbTest = null;
      try {
        const { count, error } = await supabase
          .from('leads')
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          dbTest = { error: error.message, success: false };
        } else {
          dbTest = { totalLeads: count, success: true };
        }
      } catch (dbError) {
        dbTest = { error: dbError.message, success: false };
      }

      // Test 3: Check if we can read a single lead
      let leadTest = null;
      try {
        const { data: sampleLead, error } = await supabase
          .from('leads')
          .select('id, fullName, status, created_at')
          .limit(1)
          .single();
        
        if (error) {
          leadTest = { error: error.message, success: false };
        } else {
          leadTest = { 
            success: true,
            sampleLead: {
              id: sampleLead.id,
              fullName: sampleLead.fullName,
              status: sampleLead.status,
              created_at: sampleLead.created_at
            }
          };
        }
      } catch (leadError) {
        leadTest = { error: leadError.message, success: false };
      }

      return res.json({
        success: true,
        timestamp: new Date().toISOString(),
        environment: envTest,
        database: dbTest,
        leadSample: leadTest
      });

    } catch (error) {
      logger.error('❌ Database test error:', error);
      return res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};