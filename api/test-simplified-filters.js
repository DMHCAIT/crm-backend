const { createClient } = require('@supabase/supabase-js');

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
    console.log('🧪 Testing SIMPLIFIED follow-up filters (only followUp column)...');

    // Get current date/time for testing
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1);
    
    console.log(`📅 Current time: ${now.toISOString()}`);
    console.log(`📅 Today range: ${todayStart.toISOString()} to ${todayEnd.toISOString()}`);

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

    console.log(`\n📊 Manual categorization:`);
    console.log(`  🔴 Overdue: ${categories.overdue.length}`);
    console.log(`  🟢 Today: ${categories.today.length}`);
    console.log(`  🟡 Upcoming: ${categories.upcoming.length}`);

    // Test 1: Simplified overdue filter (before current time)
    console.log('\n🧪 Test 1: Overdue filter (followUp < now)...');
    const { data: overdueTest, error: overdueError, count: overdueCount } = await supabase
      .from('leads')
      .select('id, fullName, followUp, status', { count: 'exact' })
      .lt('followUp', now.toISOString());

    if (overdueError) {
      console.log('❌ Error:', overdueError.message);
    } else {
      console.log(`✅ Query returned: ${overdueCount} leads`);
      console.log(`   Expected: ${categories.overdue.length} leads`);
      console.log(`   Match: ${overdueCount === categories.overdue.length ? '✅ PERFECT' : '❌ MISMATCH'}`);
    }

    // Test 2: Simplified today filter (between todayStart and todayEnd)
    console.log('\n🧪 Test 2: Today filter (todayStart <= followUp <= todayEnd)...');
    const { data: todayTest, error: todayError, count: todayCount } = await supabase
      .from('leads')
      .select('id, fullName, followUp, status', { count: 'exact' })
      .gte('followUp', todayStart.toISOString())
      .lte('followUp', todayEnd.toISOString());

    if (todayError) {
      console.log('❌ Error:', todayError.message);
    } else {
      console.log(`✅ Query returned: ${todayCount} leads`);
      console.log(`   Expected: ${categories.today.length} leads`);
      console.log(`   Match: ${todayCount === categories.today.length ? '✅ PERFECT' : '❌ MISMATCH'}`);
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

    console.log('\n✅ Filter test complete');
    console.log(`\n📊 RESULTS:`);
    console.log(`   Overdue: ${result.queryTests.overdue.match ? '✅ WORKING' : '❌ BROKEN'}`);
    console.log(`   Today: ${result.queryTests.today.match ? '✅ WORKING' : '❌ BROKEN'}`);

    return res.json({ success: true, ...result });

  } catch (error) {
    console.error('❌ Error testing filters:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
