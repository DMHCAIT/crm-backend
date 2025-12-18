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
    console.log('🔍 Testing follow-up columns in database...');

    // Get sample of leads with any follow-up date
    const { data: leads, error } = await supabase
      .from('leads')
      .select('id, fullName, followUp, nextfollowup, next_follow_up, status')
      .limit(50);

    if (error) {
      throw error;
    }

    console.log(`📊 Examining ${leads.length} leads for follow-up date columns...`);

    // Analyze which columns have data
    const stats = {
      totalLeads: leads.length,
      followUpCount: 0,
      nextfollowupCount: 0,
      next_follow_upCount: 0,
      hasAnyFollowUpCount: 0,
      hasMultipleColumnsCount: 0,
      sampleData: []
    };

    leads.forEach((lead, index) => {
      const hasFollowUp = lead.followUp != null;
      const hasNextfollowup = lead.nextfollowup != null;
      const hasNext_follow_up = lead.next_follow_up != null;

      if (hasFollowUp) stats.followUpCount++;
      if (hasNextfollowup) stats.nextfollowupCount++;
      if (hasNext_follow_up) stats.next_follow_upCount++;

      if (hasFollowUp || hasNextfollowup || hasNext_follow_up) {
        stats.hasAnyFollowUpCount++;
      }

      const columnsWithData = [hasFollowUp, hasNextfollowup, hasNext_follow_up].filter(Boolean).length;
      if (columnsWithData > 1) {
        stats.hasMultipleColumnsCount++;
      }

      // Collect first 10 leads that have any follow-up date
      if ((hasFollowUp || hasNextfollowup || hasNext_follow_up) && stats.sampleData.length < 10) {
        stats.sampleData.push({
          id: lead.id.substring(0, 8) + '...',
          name: lead.fullName,
          status: lead.status,
          followUp: lead.followUp || 'null',
          nextfollowup: lead.nextfollowup || 'null',
          next_follow_up: lead.next_follow_up || 'null',
          columnsWithData
        });
      }
    });

    // Calculate percentages
    const percentages = {
      followUpPercent: ((stats.followUpCount / stats.totalLeads) * 100).toFixed(1),
      nextfollowupPercent: ((stats.nextfollowupCount / stats.totalLeads) * 100).toFixed(1),
      next_follow_upPercent: ((stats.next_follow_upCount / stats.totalLeads) * 100).toFixed(1)
    };

    console.log('📊 Follow-up Column Statistics:');
    console.log(`  - followUp: ${stats.followUpCount}/${stats.totalLeads} (${percentages.followUpPercent}%)`);
    console.log(`  - nextfollowup: ${stats.nextfollowupCount}/${stats.totalLeads} (${percentages.nextfollowupPercent}%)`);
    console.log(`  - next_follow_up: ${stats.next_follow_upCount}/${stats.totalLeads} (${percentages.next_follow_upPercent}%)`);
    console.log(`  - Leads with ANY follow-up: ${stats.hasAnyFollowUpCount}/${stats.totalLeads}`);
    console.log(`  - Leads with MULTIPLE columns: ${stats.hasMultipleColumnsCount}`);

    // Determine which column is primary
    let primaryColumn = 'followUp';
    let maxCount = stats.followUpCount;
    
    if (stats.nextfollowupCount > maxCount) {
      primaryColumn = 'nextfollowup';
      maxCount = stats.nextfollowupCount;
    }
    
    if (stats.next_follow_upCount > maxCount) {
      primaryColumn = 'next_follow_up';
      maxCount = stats.next_follow_upCount;
    }

    const analysis = {
      ...stats,
      percentages,
      primaryColumn,
      recommendation: maxCount === stats.followUpCount 
        ? '✅ Using followUp (camelCase) - matches frontend display'
        : `⚠️ Data is primarily in '${primaryColumn}' but frontend displays 'followUp'`
    };

    console.log('\n💡 Analysis:', analysis.recommendation);

    return res.json({
      success: true,
      analysis,
      sampleData: stats.sampleData
    });

  } catch (error) {
    console.error('❌ Error testing follow-up columns:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
