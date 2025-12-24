const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger');


// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'authorization,Accept,content-type,x-requested-with');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    logger.info('🔍 Testing timezone handling for IST (UTC+5:30)...');

    // Current time in different formats
    const now = new Date();
    const utcTime = now.toISOString(); // UTC time
    const utcTimeShort = utcTime.slice(0, 16); // Remove seconds and Z
    
    // IST is UTC+5:30
    const istOffset = 5.5 * 60 * 60 * 1000; // 5.5 hours in milliseconds
    const istTime = new Date(now.getTime() + istOffset);
    const istTimeStr = istTime.toISOString().slice(0, 16).replace('Z', '');
    const istDateStr = istTime.toISOString().slice(0, 10);

    logger.info('\n⏰ Time Comparison:');
    logger.info(`   UTC: ${utcTime}`);
    logger.info(`   UTC Short: ${utcTimeShort}`);
    logger.info(`   IST: ${istTimeStr} (UTC+5:30)`);
    logger.info(`   IST Date: ${istDateStr}`);

    // Test: Get today's leads using different time formats
    const istTodayStart = `${istDateStr}T00:00`;
    const istTodayEnd = `${istDateStr}T23:59`;
    
    logger.info('\n🧪 Testing "Today" filter with IST timezone:');
    logger.info(`   Range: ${istTodayStart} to ${istTodayEnd}`);

    const { data: todayLeads, error, count } = await supabase
      .from('leads')
      .select('id, fullName, followUp, status', { count: 'exact' })
      .gte('followUp', istTodayStart)
      .lte('followUp', istTodayEnd);

    if (error) throw error;

    logger.info(`✅ Found ${count} leads for today (IST)`);

    // Test: Overdue filter with IST time
    logger.info('\n🧪 Testing "Overdue" filter with IST timezone:');
    logger.info(`   Before: ${istTimeStr}`);

    const { data: overdueLeads, error: overdueError, count: overdueCount } = await supabase
      .from('leads')
      .select('id, fullName, followUp, status', { count: 'exact' })
      .lt('followUp', istTimeStr);

    if (overdueError) throw overdueError;

    logger.info(`✅ Found ${overdueCount} overdue leads (IST)`);

    // Get some samples to verify
    const todaySamples = todayLeads.slice(0, 5).map(l => ({
      name: l.fullName,
      followUp: l.followUp,
      status: l.status
    }));

    const overdueSamples = overdueLeads.slice(-5).map(l => ({
      name: l.fullName,
      followUp: l.followUp,
      status: l.status
    }));

    const result = {
      currentTime: {
        utc: utcTime,
        ist: istTimeStr,
        istDate: istDateStr
      },
      todayFilter: {
        range: `${istTodayStart} to ${istTodayEnd}`,
        count: count,
        samples: todaySamples
      },
      overdueFilter: {
        before: istTimeStr,
        count: overdueCount,
        samples: overdueSamples
      },
      recommendation: '✅ Using IST timezone (UTC+5:30) for accurate filtering'
    };

    return res.json({ success: true, ...result });

  } catch (error) {
    logger.error('❌ Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
