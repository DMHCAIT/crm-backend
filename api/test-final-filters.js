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
    logger.info('🧪 Testing FINAL timezone-aware filters...');

    const now = new Date();
    const nowStr = now.toISOString().slice(0, 16); // "2025-12-18T09:44" format
    const todayDate = now.toISOString().slice(0, 10); // "2025-12-18"
    const todayStart = `${todayDate}T00:00`;
    const todayEnd = `${todayDate}T23:59`;
    
    logger.info(`\n📅 Current time: ${now.toISOString()}`);
    logger.info(`📅 Filter time: ${nowStr}`);
    logger.info(`📅 Today range: ${todayStart} to ${todayEnd}`);

    // Get all leads with follow-up dates
    const { data: allLeads, error: allError } = await supabase
      .from('leads')
      .select('id, fullName, followUp, status')
      .not('followUp', 'is', null)
      .order('followUp', { ascending: true });

    if (allError) throw allError;

    // Manual categorization (using string comparison since DB has no timezone)
    const categories = {
      overdue: [],
      today: [],
      upcoming: []
    };

    allLeads.forEach(lead => {
      const followUp = lead.followUp;
      
      if (followUp < nowStr) {
        categories.overdue.push(lead);
      } else if (followUp >= todayStart && followUp <= todayEnd) {
        categories.today.push(lead);
      } else {
        categories.upcoming.push(lead);
      }
    });

    logger.info(`\n📊 Manual categorization (string comparison):`);
    logger.info(`  🔴 Overdue (< ${nowStr}): ${categories.overdue.length}`);
    logger.info(`  🟢 Today (${todayStart} to ${todayEnd}): ${categories.today.length}`);
    logger.info(`  🟡 Upcoming (> ${todayEnd}): ${categories.upcoming.length}`);

    // Test 1: Overdue filter
    logger.info('\n🧪 Test 1: Overdue filter (followUp < nowStr)...');
    const { data: overdueTest, error: overdueError, count: overdueCount } = await supabase
      .from('leads')
      .select('id, fullName, followUp, status', { count: 'exact' })
      .lt('followUp', nowStr);

    if (overdueError) {
      logger.info('❌ Error:', overdueError.message);
    } else {
      const match = overdueCount === categories.overdue.length;
      logger.info(`   Query returned: ${overdueCount} leads`);
      logger.info(`   Expected: ${categories.overdue.length} leads`);
      logger.info(`   Match: ${match ? '✅ PERFECT!' : '❌ MISMATCH'}`);
    }

    // Test 2: Today filter
    logger.info('\n🧪 Test 2: Today filter (todayStart <= followUp <= todayEnd)...');
    const { data: todayTest, error: todayError, count: todayCount } = await supabase
      .from('leads')
      .select('id, fullName, followUp, status', { count: 'exact' })
      .gte('followUp', todayStart)
      .lte('followUp', todayEnd);

    if (todayError) {
      logger.info('❌ Error:', todayError.message);
    } else {
      const match = todayCount === categories.today.length;
      logger.info(`   Query returned: ${todayCount} leads`);
      logger.info(`   Expected: ${categories.today.length} leads`);
      logger.info(`   Match: ${match ? '✅ PERFECT!' : '❌ MISMATCH'}`);
    }

    const result = {
      currentTime: now.toISOString(),
      filterTime: nowStr,
      todayRange: { start: todayStart, end: todayEnd },
      manualCategorization: {
        overdue: categories.overdue.length,
        today: categories.today.length,
        upcoming: categories.upcoming.length
      },
      queryTests: {
        overdue: {
          returned: overdueCount,
          expected: categories.overdue.length,
          match: overdueCount === categories.overdue.length,
          query: `followUp < "${nowStr}"`
        },
        today: {
          returned: todayCount,
          expected: categories.today.length,
          match: todayCount === categories.today.length,
          query: `"${todayStart}" <= followUp <= "${todayEnd}"`
        }
      },
      samples: {
        overdue: categories.overdue.slice(-5).map(l => ({
          id: l.id.substring(0, 8),
          name: l.fullName,
          followUp: l.followUp,
          status: l.status
        })),
        today: categories.today.slice(0, 5).map(l => ({
          id: l.id.substring(0, 8),
          name: l.fullName,
          followUp: l.followUp,
          status: l.status
        }))
      },
      verdict: (overdueCount === categories.overdue.length && todayCount === categories.today.length)
        ? '✅✅✅ ALL FILTERS WORKING PERFECTLY!'
        : '❌ Some filters still have issues'
    };

    logger.info(`\n\n${result.verdict}`);

    return res.json({ success: true, ...result });

  } catch (error) {
    logger.error('❌ Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
