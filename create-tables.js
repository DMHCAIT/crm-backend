// Manual table creation script
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function createTables() {
  console.log('🏗️ Creating database tables...');

  try {
    // Create leads table using direct SQL query
    const { error: leadsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS leads (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255),
          phone VARCHAR(20),
          course_interest VARCHAR(100),
          lead_source VARCHAR(50) NOT NULL DEFAULT 'manual',
          status VARCHAR(50) NOT NULL DEFAULT 'new',
          stage VARCHAR(50) NOT NULL DEFAULT 'inquiry',
          priority VARCHAR(20) NOT NULL DEFAULT 'medium',
          assigned_to UUID,
          notes TEXT,
          tags TEXT[],
          custom_fields JSONB DEFAULT '{}',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
        CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);
        CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
      `
    });

    if (leadsError) {
      console.log('❌ Error creating leads table:', leadsError.message);
      
      // Try alternative method - direct table creation
      console.log('🔄 Trying alternative table creation...');
      
      const { error: altError } = await supabase
        .from('leads')
        .select('id')
        .limit(1);
        
      if (altError && altError.code === 'PGRST116') {
        console.log('📋 Table does not exist. Creating via Supabase dashboard is recommended.');
        console.log('💡 Please create the leads table manually in your Supabase dashboard.');
      }
    } else {
      console.log('✅ Leads table created successfully');
    }

    // Test the table by inserting a sample lead
    console.log('🧪 Testing leads table...');
    
    const { data: testLead, error: insertError } = await supabase
      .from('leads')
      .insert([{
        name: 'Test Lead',
        email: 'test@example.com',
        phone: '1234567890',
        course_interest: 'Test Course',
        status: 'new'
      }])
      .select()
      .single();

    if (insertError) {
      console.log('❌ Error inserting test lead:', insertError.message);
    } else {
      console.log('✅ Test lead created:', testLead.id);
      
      // Clean up test lead
      await supabase.from('leads').delete().eq('id', testLead.id);
      console.log('🧹 Test lead cleaned up');
    }

  } catch (error) {
    console.error('❌ Table creation failed:', error);
  }
}

createTables();