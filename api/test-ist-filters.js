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
    console.log('🧪 Testing IST-aware filters (FINAL)...');

    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
    const istNow = new Date(now.getTime() + istOffset);
    const istTimeStr = istNow.toISOString().slice(0, 16).replace('Z', '');
    const istDateStr = istNow.toISOString().slice(0, 10);
    const istTodayStart = `${istDateStr}T00:00`;
    const istTodayEnd = `${istDateStr}T23:59`;

    console.log(`\n⏰ Current Time:`);
    console.log(`   UTC: ${now.toISOString()}`);
    console.log(`   IST: ${istTimeStr} (UTC+5:30)`);
    console.log(`   IST Date: ${istDateStr}`);

    // Get all leads for manual verification
    const { data: allLeads, error: allError } = await supabase
      .from('leads')
      .select('id, fullName, followUp, status')
      .not('followUp', 'is', null)
      .order('followUp', { ascending: true });

    if (allError) throw allError;

    // Manual categorization using IST time
    const categories = {
      overdue: [],
      today: [],
      upcoming: []
    };

    allLeads.forEach(lead => {
      const followUp = lead.followUp;
      
      if (followUp < istTimeStr) {
        categories.overdue.push(lead);
      } else if (followUp >= istTodayStart && followUp <= istTodayEnd) {
        categories.today.push(lead);
      } else {
        categories.upcoming.push(lead);
      }
    });

    console.log(`\n📊 Manual categorization (IST):`);
    console.log(`  🔴 Overdue (< ${istTimeStr}): ${categories.overdue.length}`);
    console.log(`  🟢 Today (${istTodayStart} to ${istTodayEnd}): ${categories.today.length}`);
    console.log(`  🟡 Upcoming (> ${istTodayEnd}): ${categories.upcoming.length}`);

    // Test 1: Overdue filter
    console.log('\n🧪 Test 1: Overdue filter...');
    const { data: overdueTest, count: overdueCount } = await supabase
      .from('leads')
      .select('id, fullName, followUp, status', { count: 'exact' })
      .lt('followUp', istTimeStr);

    const overdueMatch = overdueCount === categories.overdue.length;
    console.log(`   Query: followUp < "${istTimeStr}"`);
    console.log(`   Returned: ${overdueCount} leads`);
    console.log(`   Expected: ${categories.overdue.length} leads`);
    console.log(`   Result: ${overdueMatch ? '✅ PERFECT MATCH!' : '❌ MISMATCH'}`);

    // Test 2: Today filter
    console.log('\n🧪 Test 2: Today filter...');
    const { data: todayTest, count: todayCount } = await supabase
      .from('leads')
      .select('id, fullName, followUp, status', { count: 'exact' })
      .gte('followUp', istTodayStart)
      .lte('followUp', istTodayEnd);

    const todayMatch = todayCount === categories.today.length;
    console.log(`   Query: "${istTodayStart}" <= followUp <= "${istTodayEnd}"`);
    console.log(`   Returned: ${todayCount} leads`);
    console.log(`   Expected: ${categories.today.length} leads`);
    console.log(`   Result: ${todayMatch ? '✅ PERFECT MATCH!' : '❌ MISMATCH'}`);

    // Show samples
    const result = {
      currentTime: {
        utc: now.toISOString(),
        ist: istTimeStr
      },
      todayRange: {
        start: istTodayStart,
        end: istTodayEnd
      },
      results: {
        overdue: {
          count: overdueCount,
          expected: categories.overdue.length,
          match: overdueMatch,
          samples: categories.overdue.slice(-5).map(l => ({
            id: l.id.substring(0, 8),
            name: l.fullName,
            followUp: l.followUp,
            status: l.status
          }))
        },
        today: {
          count: todayCount,
          expected: categories.today.length,
          match: todayMatch,
          samples: categories.today.slice(0, 5).map(l => ({
            id: l.id.substring(0, 8),
            name: l.fullName,
            followUp: l.followUp,
            status: l.status
          }))
        }
      },
      verdict: (overdueMatch && todayMatch)
        ? '✅✅✅ ALL FILTERS WORKING WITH IST TIMEZONE!'
        : '❌ Filters need adjustment'
    };

    console.log(`\n\n${result.verdict}`);

    return res.json({ success: true, ...result });

  } catch (error) {
    console.error('❌ Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
