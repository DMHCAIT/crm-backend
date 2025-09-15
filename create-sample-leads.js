const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://sxdmrxwclxmuymlvocjd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4ZG1yeHdjbHhtdXltbHZvY2pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ5NDIzNzcsImV4cCI6MjA1MDUxODM3N30.6VY9t1X5nEUda-FP2fp8m1Ex4LJfipnW9mLMNlhM29E';

const supabase = createClient(supabaseUrl, supabaseKey);

// Sample lead data with various dates for testing filters
const sampleLeads = [
    {
        name: 'John Smith',
        email: 'john.smith@email.com',
        phone: '+1-555-0101',
        course_interested: 'React Development',
        lead_source: 'Website',
        status: 'new',
        notes: 'Interested in full-stack development program',
        created_at: '2024-12-23T10:00:00Z',
        updated_at: '2024-12-23T10:00:00Z'
    },
    {
        name: 'Sarah Johnson',
        email: 'sarah.johnson@email.com',
        phone: '+1-555-0102',
        course_interested: 'Data Science',
        lead_source: 'Facebook',
        status: 'contacted',
        notes: 'Looking for machine learning courses',
        created_at: '2024-12-22T14:30:00Z',
        updated_at: '2024-12-23T09:15:00Z'
    },
    {
        name: 'Mike Davis',
        email: 'mike.davis@email.com',
        phone: '+1-555-0103',
        course_interested: 'Python Programming',
        lead_source: 'Google Ads',
        status: 'qualified',
        notes: 'Ready to enroll next batch',
        created_at: '2024-12-21T16:45:00Z',
        updated_at: '2024-12-22T11:20:00Z'
    },
    {
        name: 'Emily Brown',
        email: 'emily.brown@email.com',
        phone: '+1-555-0104',
        course_interested: 'Web Design',
        lead_source: 'Referral',
        status: 'converted',
        notes: 'Successfully enrolled in UI/UX course',
        created_at: '2024-12-20T08:00:00Z',
        updated_at: '2024-12-21T10:30:00Z'
    },
    {
        name: 'David Wilson',
        email: 'david.wilson@email.com',
        phone: '+1-555-0105',
        course_interested: 'Mobile App Development',
        lead_source: 'LinkedIn',
        status: 'new',
        notes: 'Interested in Flutter development',
        created_at: '2024-12-19T12:15:00Z',
        updated_at: '2024-12-19T12:15:00Z'
    }
];

async function createSampleLeads() {
    console.log('📝 Creating sample leads in database...\n');
    
    try {
        // First, check if we have any existing leads
        const { data: existingLeads, error: checkError } = await supabase
            .from('leads')
            .select('count(*)')
            .single();
            
        if (checkError) {
            console.log('❌ Error checking existing leads:', checkError.message);
            return;
        }
        
        console.log('📊 Current leads in database:', existingLeads?.count || 0);
        
        // Insert sample leads
        const { data: insertedLeads, error: insertError } = await supabase
            .from('leads')
            .insert(sampleLeads)
            .select();
            
        if (insertError) {
            console.log('❌ Error inserting sample leads:', insertError.message);
            return;
        }
        
        console.log(`✅ Successfully created ${insertedLeads.length} sample leads:`);
        insertedLeads.forEach((lead, index) => {
            console.log(`  ${index + 1}. ${lead.name} - ${lead.status} - ${lead.created_at}`);
        });
        
        // Verify the total count
        const { data: finalCount, error: countError } = await supabase
            .from('leads')
            .select('count(*)')
            .single();
            
        if (!countError) {
            console.log(`\n📈 Total leads in database: ${finalCount?.count || 0}`);
        }
        
    } catch (error) {
        console.log('❌ Unexpected error:', error.message);
    }
}

// Run the script
createSampleLeads().then(() => {
    console.log('\n🎯 Sample lead creation completed!');
}).catch(console.error);