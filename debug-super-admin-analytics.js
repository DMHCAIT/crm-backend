// 🔍 Debug Super Admin Analytics
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function debugSuperAdminAnalytics() {
  console.log('🔍 Debugging Super Admin Analytics...\n');

  try {
    // 1. Check total leads count
    const { count: totalLeads } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true });
    
    console.log(`📊 Total leads in database: ${totalLeads}`);

    // 2. Check total updates count
    const { count: totalUpdates } = await supabase
      .from('leads')
      .select('updated_by, updated_at', { count: 'exact', head: true })
      .not('updated_by', 'is', null);
    
    console.log(`📈 Total updates in database: ${totalUpdates}`);

    // 3. Check unique users who made updates
    const { data: allUpdates, error: updatesError } = await supabase
      .from('leads')
      .select('updated_by, updated_at')
      .not('updated_by', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(1000);

    if (updatesError) {
      console.error('❌ Error fetching updates:', updatesError);
      return;
    }

    if (!allUpdates || allUpdates.length === 0) {
      console.log('⚠️ No updates found in leads table');
      return;
    }

    console.log(`📝 Found ${allUpdates.length} updates`);

    const uniqueUserIds = new Set();
    allUpdates.forEach(update => {
      if (update.updated_by && update.updated_by !== 'Unknown' && update.updated_by !== 'System') {
        uniqueUserIds.add(update.updated_by);
      }
    });

    console.log(`👥 Unique users who made updates: ${uniqueUserIds.size}`);
    console.log('🔑 User IDs found:', Array.from(uniqueUserIds).slice(0, 10), '...');

    // 4. Lookup actual usernames
    if (uniqueUserIds.size > 0) {
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, username, name, email')
        .in('id', Array.from(uniqueUserIds));

      if (!usersError && users) {
        console.log(`\n👤 Found ${users.length} users in users table:`);
        users.forEach(user => {
          const displayName = user.username || user.name || user.email?.split('@')[0] || 'Unknown';
          console.log(`   ${user.id} -> ${displayName}`);
        });

        // Check which user IDs don't have corresponding users
        const foundUserIds = new Set(users.map(u => u.id));
        const missingUsers = Array.from(uniqueUserIds).filter(id => !foundUserIds.has(id));
        
        if (missingUsers.length > 0) {
          console.log(`\n⚠️ User IDs not found in users table: ${missingUsers.length}`);
          console.log('Missing IDs:', missingUsers.slice(0, 10));
        }
      } else {
        console.error('❌ Error fetching users:', usersError);
      }
    }

    // 5. Check recent updates count (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { count: recentUpdates } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .gte('updated_at', sevenDaysAgo.toISOString());
    
    console.log(`\n📅 Updates in last 7 days: ${recentUpdates}`);

    // 6. Check user activity stats
    const userStats = {};
    allUpdates.forEach(update => {
      const userId = update.updated_by || 'Unknown';
      if (!userStats[userId]) {
        userStats[userId] = { count: 0, lastUpdate: null };
      }
      userStats[userId].count++;
      if (!userStats[userId].lastUpdate || update.updated_at > userStats[userId].lastUpdate) {
        userStats[userId].lastUpdate = update.updated_at;
      }
    });

    const sortedStats = Object.entries(userStats)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10);

    console.log('\n🏆 Top 10 most active users:');
    sortedStats.forEach(([userId, stats]) => {
      console.log(`   ${userId}: ${stats.count} updates (last: ${stats.lastUpdate})`);
    });

  } catch (error) {
    console.error('❌ Debug error:', error);
  }
}

debugSuperAdminAnalytics();