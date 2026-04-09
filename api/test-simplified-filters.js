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
    logger.info('🧪 Testing SIMPLIFIED follow-up filters (only followUp column)...');

    // Get current date/time for testing
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1);
    
    logger.info(`📅 Current time: ${now.toISOString()}`);
    logger.info(`📅 Today range: ${todayStart.toISOString()} to ${todayEnd.toISOString()}`);

    // Get all leads with follow-up dates for comparison
    const { data: allLeads, error: allError } = await supabase
      .from('leads')
      .select('id, fullName, followUp, status')
      .not('followUp', 'is', null)
      .order('followUp', { ascending: true });

    if (allError) throw allError;

    // Categorize leads manually
    const categories = {
      overdue: [],
      today: [],
      upcoming: []
    };

    allLeads.forEach(lead => {
      const followUpDate = new Date(lead.followUp);
      const leadDate = new Date(followUpDate.getFullYear(), followUpDate.getMonth(), followUpDate.getDate());
      const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      if (followUpDate < now) {
        categories.overdue.push(lead);
      } else if (leadDate.getTime() === todayDate.getTime()) {
        categories.today.push(lead);
      } else {
        categories.upcoming.push(lead);
      }
    });

    logger.info(`\n📊 Manual categorization:`);
    logger.info(`  🔴 Overdue: ${categories.overdue.length}`);
    logger.info(`  🟢 Today: ${categories.today.length}`);
    logger.info(`  🟡 Upcoming: ${categories.upcoming.length}`);

    // Test 1: Simplified overdue filter (before current time)
    logger.info('\n🧪 Test 1: Overdue filter (followUp < now)...');
    const { data: overdueTest, error: overdueError, count: overdueCount } = await supabase
      .from('leads')
      .select('id, fullName, followUp, status', { count: 'exact' })
      .lt('followUp', now.toISOString());

    if (overdueError) {
      logger.info('❌ Error:', overdueError.message);
    } else {
      logger.info(`✅ Query returned: ${overdueCount} leads`);
      logger.info(`   Expected: ${categories.overdue.length} leads`);
      logger.info(`   Match: ${overdueCount === categories.overdue.length ? '✅ PERFECT' : '❌ MISMATCH'}`);
    }

    // Test 2: Simplified today filter (between todayStart and todayEnd)
    logger.info('\n🧪 Test 2: Today filter (todayStart <= followUp <= todayEnd)...');
    const { data: todayTest, error: todayError, count: todayCount } = await supabase
      .from('leads')
      .select('id, fullName, followUp, status', { count: 'exact' })
      .gte('followUp', todayStart.toISOString())
      .lte('followUp', todayEnd.toISOString());

    if (todayError) {
      logger.info('❌ Error:', todayError.message);
    } else {
      logger.info(`✅ Query returned: ${todayCount} leads`);
      logger.info(`   Expected: ${categories.today.length} leads`);
      logger.info(`   Match: ${todayCount === categories.today.length ? '✅ PERFECT' : '❌ MISMATCH'}`);
    }

    // Show sample data
    const result = {
      currentTime: now.toISOString(),
      todayRange: { start: todayStart.toISOString(), end: todayEnd.toISOString() },
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
          query: `followUp < ${now.toISOString()}`
        },
        today: {
          returned: todayCount,
          expected: categories.today.length,
          match: todayCount === categories.today.length,
          query: `${todayStart.toISOString()} <= followUp <= ${todayEnd.toISOString()}`
        }
      },
      samples: {
        overdue: categories.overdue.slice(0, 5).map(l => ({
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
      }
    };

    logger.info('\n✅ Filter test complete');
    logger.info(`\n📊 RESULTS:`);
    logger.info(`   Overdue: ${result.queryTests.overdue.match ? '✅ WORKING' : '❌ BROKEN'}`);
    logger.info(`   Today: ${result.queryTests.today.match ? '✅ WORKING' : '❌ BROKEN'}`);

    return res.json({ success: true, ...result });

  } catch (error) {
    logger.error('❌ Error testing filters:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
