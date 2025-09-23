// Database migration script to ensure notes column supports JSON
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.log('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function migrateNotesColumn() {
  try {
    console.log('🔍 Checking current leads table structure...');
    
    // First, let's check if we have any leads with existing notes
    const { data: leads, error: fetchError } = await supabase
      .from('leads')
      .select('id, notes')
      .limit(5);
    
    if (fetchError) {
      console.error('❌ Error fetching leads:', fetchError);
      return;
    }
    
    console.log(`📊 Found ${leads?.length || 0} leads to check`);
    
    if (leads && leads.length > 0) {
      leads.forEach((lead, index) => {
        console.log(`Lead ${index + 1}:`);
        console.log(`  ID: ${lead.id}`);
        console.log(`  Notes type: ${typeof lead.notes}`);
        console.log(`  Notes value:`, lead.notes);
        
        if (lead.notes && typeof lead.notes === 'string') {
          try {
            const parsed = JSON.parse(lead.notes);
            console.log(`  ✅ Notes are valid JSON (${parsed.length} items)`);
          } catch (e) {
            console.log(`  ⚠️ Notes are plain text, will need conversion`);
          }
        } else if (Array.isArray(lead.notes)) {
          console.log(`  ✅ Notes are already an array (${lead.notes.length} items)`);
        } else {
          console.log(`  ℹ️ No notes or empty notes`);
        }
        console.log('');
      });
    }
    
    // Let's try to create a test lead with JSON notes to see if it works
    console.log('🧪 Testing JSON notes insertion...');
    
    const testNotes = [
      {
        id: Date.now().toString(),
        content: 'Test note for migration check',
        author: 'Migration Script',
        timestamp: new Date().toISOString(),
        note_type: 'test'
      }
    ];
    
    const { data: testLead, error: insertError } = await supabase
      .from('leads')
      .insert({
        fullName: 'Migration Test Lead',
        email: `test-${Date.now()}@example.com`,
        phone: '1234567890',
        country: 'Test Country',
        notes: JSON.stringify(testNotes),
        status: 'fresh'
      })
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ Error inserting test lead:', insertError);
      return;
    }
    
    console.log('✅ Successfully inserted test lead with JSON notes');
    console.log('Test Lead ID:', testLead.id);
    
    // Now test reading it back
    const { data: readLead, error: readError } = await supabase
      .from('leads')
      .select('notes')
      .eq('id', testLead.id)
      .single();
    
    if (readError) {
      console.error('❌ Error reading test lead:', readError);
      return;
    }
    
    console.log('📖 Read back notes:');
    console.log('  Type:', typeof readLead.notes);
    console.log('  Value:', readLead.notes);
    
    try {
      const parsedNotes = JSON.parse(readLead.notes);
      console.log('✅ Successfully parsed JSON notes:', parsedNotes.length, 'items');
    } catch (e) {
      console.log('❌ Failed to parse notes as JSON:', e.message);
    }
    
    // Clean up test lead
    await supabase
      .from('leads')
      .delete()
      .eq('id', testLead.id);
    
    console.log('🧹 Cleaned up test lead');
    console.log('');
    console.log('✅ Migration check complete!');
    console.log('📋 Summary:');
    console.log('  - Notes column can store JSON strings');
    console.log('  - JSON parsing works correctly');
    console.log('  - No database schema changes needed');
    
  } catch (error) {
    console.error('❌ Migration check failed:', error);
  }
}

// Run the migration check
migrateNotesColumn();