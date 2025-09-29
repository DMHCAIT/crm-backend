const fs = require('fs');
const csv = require('csv-parser');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL || 'your-supabase-url';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'your-service-key';

if (!supabaseUrl || !supabaseServiceKey || supabaseUrl === 'your-supabase-url') {
  console.error('❌ Please set SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// CSV file path
const csvFilePath = '/Users/rubeenakhan/Downloads/CRM/IBMP-clean.csv';

// Helper functions
function cleanPhoneNumber(phone) {
  if (!phone || phone.trim() === '') return '';
  
  // Handle scientific notation (e.g., 2.01E+11)
  if (phone.toString().includes('E+') || phone.toString().includes('e+')) {
    phone = parseFloat(phone).toString();
  }
  
  // Remove all non-digit characters except +
  let cleaned = phone.toString().replace(/[^\d+]/g, '');
  
  // If it starts with +, keep it, otherwise add country code if it's a valid number
  if (cleaned.startsWith('+')) {
    return cleaned;
  } else if (cleaned.length >= 10) {
    // Add + for international format
    return '+' + cleaned;
  }
  
  return cleaned;
}

function standardizeStatus(status) {
  if (!status) return 'Fresh';
  
  const statusMap = {
    'follow up': 'Follow Up',
    'followup': 'Follow Up',
    'not interested': 'Not Interested',
    'not answering': 'Not Interested',
    'enrolled': 'Enrolled',
    'hot': 'Hot',
    'warm': 'Warm',
    'fresh': 'Fresh',
    'junk': 'Junk'
  };
  
  const normalizedStatus = status.toLowerCase().trim();
  return statusMap[normalizedStatus] || 'Fresh';
}

function standardizeQualification(qualification) {
  if (!qualification) return 'Others';
  
  const qualMap = {
    'mbbs/fmg': 'MBBS/ FMG',
    'md/ms/dnb': 'MD/MS/DNB',
    'mch/ dm/ dnb-ss': 'Mch/ DM/ DNB-SS',
    'bds/mds': 'BDS/MDS',
    'ayush': 'AYUSH',
    'others': 'Others'
  };
  
  const normalizedQual = qualification.toLowerCase().trim();
  return qualMap[normalizedQual] || 'Others';
}

function standardizeCourseName(course, qualification) {
  if (!course) return 'Fellowship in General Medicine';
  
  // Clean the course name
  let cleanCourse = course.trim();
  
  // If course already has Fellowship or PG Diploma prefix, return as is
  if (cleanCourse.startsWith('Fellowship in') || cleanCourse.startsWith('PG Diploma in')) {
    return cleanCourse;
  }
  
  // Determine prefix based on qualification level
  const pgDiplomaQuals = ['MBBS/ FMG', 'BDS/MDS', 'AYUSH'];
  const fellowshipQuals = ['MD/MS/DNB', 'Mch/ DM/ DNB-SS'];
  
  if (pgDiplomaQuals.includes(qualification)) {
    return 'PG Diploma in ' + cleanCourse;
  } else if (fellowshipQuals.includes(qualification)) {
    return 'Fellowship in ' + cleanCourse;
  } else {
    // Default to Fellowship for Others
    return 'Fellowship in ' + cleanCourse;
  }
}

// getUserByName function disabled for bulk import - will assign users later
// async function getUserByName(assignedTo) { ... }

async function importLeads() {
  console.log('🚀 Starting IBMP leads import...');
  console.log('📂 Reading CSV file: ' + csvFilePath);
  
  const leads = [];
  let successCount = 0;
  let failureCount = 0;
  
  return new Promise((resolve, reject) => {
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on('data', (row) => {
        // Debug: Log first few rows to understand structure
        if (leads.length < 3) {
          console.log('Debug - Row data:', row);
        }
        
        // Skip empty rows
        if (!row['Full Name'] || row['Full Name'].trim() === '') {
          return;
        }
        
        const lead = {
          full_name: row['Full Name'] ? row['Full Name'].trim() : '',
          email: (row['Email '] || row['Email']) ? (row['Email '] || row['Email']).trim() : '',
          phone: cleanPhoneNumber(row['Phone']),
          qualification: standardizeQualification(row['Qualification']),
          course: standardizeCourseName((row['Course '] || row['Course']) ? (row['Course '] || row['Course']).trim() : '', standardizeQualification(row['Qualification'])),
          country: row['Country'] ? row['Country'].trim() : '',
          assigned_to: row['Assigned to'] ? row['Assigned to'].trim() : '',
          status: standardizeStatus(row['Status']),
          notes: row['Notes'] ? row['Notes'].trim() : '',
          source: 'IBMP Import',
          created_at: new Date().toISOString()
        };
        
        leads.push(lead);
        
        // Progress logging every 100 leads
        if (leads.length % 100 === 0) {
          console.log('📊 Parsed ' + leads.length + ' leads so far...');
        }
      })
      .on('end', async () => {
        console.log('📊 Parsed ' + leads.length + ' leads from CSV');
        
        if (leads.length === 0) {
          console.log('⚠️ No valid leads found in CSV');
          resolve();
          return;
        }
        
        // Process leads in batches
        const batchSize = 100;
        for (let i = 0; i < leads.length; i += batchSize) {
          const batch = leads.slice(i, i + batchSize);
          console.log('🔄 Processing batch ' + (Math.floor(i/batchSize) + 1) + ' (' + batch.length + ' leads)...');
          
          for (const lead of batch) {
            try {              
              // Prepare lead data for database - simplified version without user lookup
              const leadData = {
                full_name: lead.full_name,
                email: lead.email,
                phone: lead.phone,
                qualification: lead.qualification,
                course: lead.course,
                country: lead.country,
                status: lead.status,
                notes: lead.notes,
                source: lead.source,
                created_at: lead.created_at,
                assigned_to_user: lead.assigned_to || null, // Store the name directly for now
                assigned_to_user_id: null // Will be updated later if needed
              };
              
              // Insert lead into database
              const { data, error } = await supabase
                .from('leads')
                .insert([leadData])
                .select();
              
              if (error) {
                console.error('❌ Failed to insert lead ' + lead.full_name + ':', error.message);
                failureCount++;
              } else {
                successCount++;
                if (successCount % 50 === 0) {
                  console.log('✅ Imported ' + successCount + ' leads so far...');
                }
              }
              
            } catch (error) {
              console.error('❌ Error processing lead ' + lead.full_name + ':', error.message);
              failureCount++;
            }
          }
          
          // Small delay between batches to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        console.log('\n🎉 Import completed!');
        console.log('✅ Successfully imported: ' + successCount + ' leads');
        console.log('❌ Failed to import: ' + failureCount + ' leads');
        console.log('📊 Total processed: ' + (successCount + failureCount) + ' leads');
        
        resolve();
      })
      .on('error', (error) => {
        console.error('❌ Error reading CSV file:', error);
        reject(error);
      });
  });
}

// Run the import
importLeads()
  .then(() => {
    console.log('\n✨ Import script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Import script failed:', error);
    process.exit(1);
  });
