// Check existing table schema
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkSchema() {
  console.log('🔍 Checking existing database schema...');

  try {
    // Try to fetch existing leads to see what columns exist
    const { data: leads, error } = await supabase
      .from('leads')
      .select('*')
      .limit(1);

    if (error) {
      console.log('❌ Error querying leads table:', error.message);
      
      // Try to see if table exists with different columns
      const { data: basicLeads, error: basicError } = await supabase
        .from('leads')
        .select('id, name, email, phone, status')
        .limit(1);
        
      if (basicError) {
        console.log('❌ Basic query also failed:', basicError.message);
      } else {
        console.log('✅ Basic columns exist:', Object.keys(basicLeads[0] || {}));
      }
    } else {
      console.log('✅ Full query successful');
      if (leads.length > 0) {
        console.log('📋 Existing columns:', Object.keys(leads[0]));
        console.log('📊 Sample lead:', leads[0]);
      } else {
        console.log('📋 Table exists but is empty');
      }
    }

    // Try inserting a simple lead with basic fields only
    console.log('\n🧪 Testing simple lead insertion...');
    const { data: testLead, error: insertError } = await supabase
      .from('leads')
      .insert([{
        name: 'Test Lead Simple',
        email: 'testsimple@example.com',
        phone: '1234567890'
      }])
      .select()
      .single();

    if (insertError) {
      console.log('❌ Simple insert failed:', insertError.message);
    } else {
      console.log('✅ Simple lead created successfully!');
      console.log('📋 Created lead structure:', testLead);
      
      // Clean up
      await supabase.from('leads').delete().eq('id', testLead.id);
      console.log('🧹 Test lead cleaned up');
    }

  } catch (error) {
    console.error('❌ Schema check failed:', error);
  }
}

checkSchema();