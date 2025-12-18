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
    console.log('🔍 Analyzing date format issues...');

    const now = new Date();
    console.log(`\n📅 Server time: ${now.toISOString()}`);
    console.log(`📅 Server local: ${now.toString()}`);

    // Get sample of dates
    const { data: samples, error } = await supabase
      .from('leads')
      .select('id, fullName, followUp, status')
      .not('followUp', 'is', null)
      .order('followUp', { ascending: false })
      .limit(50);

    if (error) throw error;

    // Analyze date formats
    const formatAnalysis = {
      dateOnly: [],        // 2025-09-03
      dateTime: [],        // 2025-12-18T15:28
      dateTimeZ: [],       // 2025-12-18T15:28:00Z
      dateTimeFull: [],    // 2025-12-18T15:28:00.000Z
      invalid: []
    };

    samples.forEach(lead => {
      const dateStr = lead.followUp;
      const sample = {
        id: lead.id.substring(0, 8),
        name: lead.fullName,
        followUp: dateStr,
        status: lead.status,
        parsedDate: new Date(dateStr).toISOString(),
        comparison: new Date(dateStr) < now ? 'OVERDUE' : 'UPCOMING'
      };

      if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        formatAnalysis.dateOnly.push(sample);
      } else if (dateStr.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)) {
        formatAnalysis.dateTime.push(sample);
      } else if (dateStr.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/)) {
        formatAnalysis.dateTimeZ.push(sample);
      } else if (dateStr.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)) {
        formatAnalysis.dateTimeFull.push(sample);
      } else {
        formatAnalysis.invalid.push(sample);
      }
    });

    const summary = {
      totalSamples: samples.length,
      dateOnly: formatAnalysis.dateOnly.length,
      dateTime: formatAnalysis.dateTime.length,
      dateTimeZ: formatAnalysis.dateTimeZ.length,
      dateTimeFull: formatAnalysis.dateTimeFull.length,
      invalid: formatAnalysis.invalid.length
    };

    console.log('\n📊 Date Format Distribution:');
    console.log(`   Date only (2025-09-03): ${summary.dateOnly}`);
    console.log(`   DateTime (2025-12-18T15:28): ${summary.dateTime}`);
    console.log(`   DateTime+Z (2025-12-18T15:28:00Z): ${summary.dateTimeZ}`);
    console.log(`   DateTime Full (2025-12-18T15:28:00.000Z): ${summary.dateTimeFull}`);
    console.log(`   Invalid: ${summary.invalid}`);

    console.log('\n🔍 Problem Analysis:');
    if (formatAnalysis.dateOnly.length > 0) {
      const sample = formatAnalysis.dateOnly[0];
      console.log(`\n   Date-only example: "${sample.followUp}"`);
      console.log(`   Parsed to: "${sample.parsedDate}"`);
      console.log(`   ⚠️ Date-only is treated as midnight UTC`);
      console.log(`   ⚠️ This causes timezone comparison issues`);
    }

    if (formatAnalysis.dateTime.length > 0) {
      const sample = formatAnalysis.dateTime[0];
      console.log(`\n   DateTime example: "${sample.followUp}"`);
      console.log(`   Parsed to: "${sample.parsedDate}"`);
      console.log(`   ⚠️ DateTime without timezone might use local or UTC`);
    }

    // Test how database compares these dates
    const testDate1 = "2025-12-18";  // Date only
    const testDate2 = "2025-12-18T15:28";  // DateTime
    const testDate3 = now.toISOString();  // Full ISO

    console.log('\n🧪 Database Comparison Test:');
    
    const { data: test1, count: count1 } = await supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .lt('followUp', testDate1);
    console.log(`   followUp < "${testDate1}": ${count1} leads`);

    const { data: test2, count: count2 } = await supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .lt('followUp', testDate2);
    console.log(`   followUp < "${testDate2}": ${count2} leads`);

    const { data: test3, count: count3 } = await supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .lt('followUp', testDate3);
    console.log(`   followUp < "${testDate3}": ${count3} leads`);

    const result = {
      serverTime: now.toISOString(),
      formatDistribution: summary,
      samples: {
        dateOnly: formatAnalysis.dateOnly.slice(0, 3),
        dateTime: formatAnalysis.dateTime.slice(0, 3),
        invalid: formatAnalysis.invalid.slice(0, 3)
      },
      comparisonTest: {
        dateOnly: count1,
        dateTime: count2,
        fullISO: count3
      },
      recommendation: formatAnalysis.dateOnly.length > 0 
        ? '⚠️ Mixed date formats detected. Need to handle date-only format specially.'
        : '✅ All dates have time component'
    };

    return res.json({ success: true, ...result });

  } catch (error) {
    console.error('❌ Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
