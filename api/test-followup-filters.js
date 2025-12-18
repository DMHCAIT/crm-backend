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
    console.log('🔍 Testing follow-up date filters...');

    // Get current date/time for testing
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();
    
    console.log(`📅 Current time: ${now.toISOString()}`);
    console.log(`📅 Today range: ${todayStart} to ${todayEnd}`);

    // Test 1: Get all leads with follow-up dates
    const { data: allLeads, error: allError } = await supabase
      .from('leads')
      .select('id, fullName, followUp, status, updated_at')
      .not('followUp', 'is', null)
      .order('followUp', { ascending: true });

    if (allError) throw allError;

    console.log(`\n📊 Found ${allLeads.length} leads with follow-up dates`);

    // Categorize leads
    const categories = {
      overdue: [],
      today: [],
      upcoming: [],
      farFuture: []
    };

    allLeads.forEach(lead => {
      const followUpDate = new Date(lead.followUp);
      const leadDate = new Date(followUpDate.getFullYear(), followUpDate.getMonth(), followUpDate.getDate());
      const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      if (followUpDate < now) {
        categories.overdue.push({
          id: lead.id.substring(0, 8),
          name: lead.fullName,
          followUp: lead.followUp,
          status: lead.status,
          daysOverdue: Math.floor((now - followUpDate) / (1000 * 60 * 60 * 24))
        });
      } else if (leadDate.getTime() === todayDate.getTime()) {
        categories.today.push({
          id: lead.id.substring(0, 8),
          name: lead.fullName,
          followUp: lead.followUp,
          status: lead.status
        });
      } else if (followUpDate > now && followUpDate < new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)) {
        categories.upcoming.push({
          id: lead.id.substring(0, 8),
          name: lead.fullName,
          followUp: lead.followUp,
          status: lead.status,
          daysAway: Math.ceil((followUpDate - now) / (1000 * 60 * 60 * 24))
        });
      } else {
        categories.farFuture.push({
          id: lead.id.substring(0, 8),
          name: lead.fullName,
          followUp: lead.followUp,
          status: lead.status
        });
      }
    });

    console.log('\n📊 Categories:');
    console.log(`  🔴 Overdue: ${categories.overdue.length}`);
    console.log(`  🟢 Today: ${categories.today.length}`);
    console.log(`  🟡 Upcoming (next 7 days): ${categories.upcoming.length}`);
    console.log(`  ⚪ Far future: ${categories.farFuture.length}`);

    // Test 2: Test the overdue filter query (using the same logic as leads.js)
    console.log('\n🧪 Testing overdue filter query...');
    const { data: overdueTest, error: overdueError } = await supabase
      .from('leads')
      .select('id, fullName, followUp, status')
      .or(`followUp.lt.${now.toISOString()},nextfollowup.lt.${now.toISOString()},next_follow_up.lt.${now.toISOString()}`)
      .not('followUp', 'is', null);

    if (overdueError) {
      console.log('❌ Overdue query error:', overdueError.message);
    } else {
      console.log(`✅ Overdue query returned: ${overdueTest.length} leads`);
      console.log(`   Expected: ${categories.overdue.length} leads`);
      console.log(`   Match: ${overdueTest.length === categories.overdue.length ? '✅' : '❌'}`);
    }

    // Test 3: Test the today filter query
    console.log('\n🧪 Testing today filter query...');
    const { data: todayTest, error: todayError } = await supabase
      .from('leads')
      .select('id, fullName, followUp, status')
      .or(`and(followUp.gte.${todayStart},followUp.lte.${todayEnd}),and(nextfollowup.gte.${todayStart},nextfollowup.lte.${todayEnd}),and(next_follow_up.gte.${todayStart},next_follow_up.lte.${todayEnd})`);

    if (todayError) {
      console.log('❌ Today query error:', todayError.message);
    } else {
      console.log(`✅ Today query returned: ${todayTest.length} leads`);
      console.log(`   Expected: ${categories.today.length} leads`);
      console.log(`   Match: ${todayTest.length === categories.today.length ? '✅' : '❌'}`);
    }

    // Show samples
    const result = {
      currentTime: now.toISOString(),
      todayRange: { start: todayStart, end: todayEnd },
      statistics: {
        totalWithFollowUp: allLeads.length,
        overdue: categories.overdue.length,
        today: categories.today.length,
        upcoming: categories.upcoming.length,
        farFuture: categories.farFuture.length
      },
      queryTests: {
        overdue: {
          returned: overdueTest?.length || 0,
          expected: categories.overdue.length,
          match: (overdueTest?.length || 0) === categories.overdue.length
        },
        today: {
          returned: todayTest?.length || 0,
          expected: categories.today.length,
          match: (todayTest?.length || 0) === categories.today.length
        }
      },
      samples: {
        overdue: categories.overdue.slice(0, 5),
        today: categories.today.slice(0, 5),
        upcoming: categories.upcoming.slice(0, 5)
      }
    };

    console.log('\n✅ Filter test complete');
    return res.json({ success: true, ...result });

  } catch (error) {
    console.error('❌ Error testing filters:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
