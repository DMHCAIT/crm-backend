const fs = require('fs');
const csv = require('csv-parser');

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
  if (!course) return 'General Medicine';
  
  // Clean the course name and truncate if too long
  let cleanCourse = course.trim();
  
  // Remove prefixes to get core course name
  cleanCourse = cleanCourse.replace(/^(Fellowship in |PG Diploma in )/i, '');
  
  // Truncate course name to fit in VARCHAR constraints (assume 50 char limit for now)
  if (cleanCourse.length > 50) {
    cleanCourse = cleanCourse.substring(0, 50).trim();
  }
  
  // For database storage, use shorter format without prefixes to save space
  // Truncate to 18 characters to be extra safe for VARCHAR(20) constraint
  if (cleanCourse.length > 18) {
    cleanCourse = cleanCourse.substring(0, 18).trim();
  }
  
  return cleanCourse;
}

function escapeSQL(str) {
  if (!str) return 'NULL';
  // Escape single quotes and return quoted string
  return "'" + str.toString().replace(/'/g, "''") + "'";
}

async function generateSQLScript() {
  console.log('🚀 Starting IBMP leads SQL generation...');
  console.log('📂 Reading CSV file: ' + csvFilePath);
  
  const leads = [];
  let sqlStatements = [];
  
  return new Promise((resolve, reject) => {
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on('data', (row) => {
        // Skip empty rows
        if (!row['Full Name'] || row['Full Name'].trim() === '') {
          return;
        }
        
        const lead = {
          full_name: row['Full Name'] ? row['Full Name'].trim().substring(0, 18) : '', // Truncate to 18 chars for VARCHAR(20) safety
          email: (row['Email '] || row['Email']) ? (row['Email '] || row['Email']).trim().substring(0, 100) : '', // Ensure reasonable length
          phone: cleanPhoneNumber(row['Phone']),
          qualification: standardizeQualification(row['Qualification']),
          course: standardizeCourseName((row['Course '] || row['Course']) ? (row['Course '] || row['Course']).trim() : '', standardizeQualification(row['Qualification'])),
          country: row['Country'] ? row['Country'].trim().substring(0, 18) : '', // Truncate to 18 chars for VARCHAR(20) safety
          assigned_to: row['Assigned to'] ? row['Assigned to'].trim().substring(0, 18) : '', // Truncate to 18 chars for VARCHAR(20) safety
          status: standardizeStatus(row['Status']),
          notes: row['Notes'] ? row['Notes'].trim().substring(0, 255) : '', // Truncate notes to 255 chars for database constraints
          source: 'IBMP',  // Shortened to fit VARCHAR(20)
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
        
        // Generate SQL INSERT statements
        console.log('🔄 Generating SQL INSERT statements...');
        
        sqlStatements.push('-- IBMP Leads Import SQL Script');
        sqlStatements.push('-- Generated on: ' + new Date().toISOString());
        sqlStatements.push('-- Total leads: ' + leads.length);
        sqlStatements.push('');
        
        for (let i = 0; i < leads.length; i++) {
          const lead = leads[i];
          
          const sqlInsert = `INSERT INTO leads (
    "fullName", 
    email, 
    phone, 
    qualification, 
    course, 
    country, 
    status, 
    notes, 
    source, 
    "createdAt", 
    "assignedTo"
) VALUES (
    ${escapeSQL(lead.full_name)},
    ${escapeSQL(lead.email)},
    ${escapeSQL(lead.phone)},
    ${escapeSQL(lead.qualification)},
    ${escapeSQL(lead.course)},
    ${escapeSQL(lead.country)},
    ${escapeSQL(lead.status)},
    ${escapeSQL(lead.notes)},
    ${escapeSQL(lead.source)},
    ${escapeSQL(lead.created_at)},
    ${escapeSQL(lead.assigned_to)}
);`;
          
          sqlStatements.push(sqlInsert);
          
          if ((i + 1) % 100 === 0) {
            console.log('✅ Generated SQL for ' + (i + 1) + ' leads...');
          }
        }
        
        // Write SQL script to file
        const sqlScript = sqlStatements.join('\n');
        const outputFile = '/Users/rubeenakhan/Downloads/CRM/ibmp-leads-import.sql';
        
        fs.writeFileSync(outputFile, sqlScript);
        
        console.log('\n🎉 SQL script generation completed!');
        console.log('📄 SQL file saved to: ' + outputFile);
        console.log('📊 Total leads processed: ' + leads.length);
        console.log('\n📋 Next steps:');
        console.log('1. Copy the SQL file to your database server');
        console.log('2. Run the SQL script in your Supabase dashboard or database client');
        console.log('3. Verify the import by checking the leads table');
        
        resolve();
      })
      .on('error', (error) => {
        console.error('❌ Error reading CSV file:', error);
        reject(error);
      });
  });
}

// Run the SQL generation
generateSQLScript()
  .then(() => {
    console.log('\n✨ SQL generation script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 SQL generation script failed:', error);
    process.exit(1);
  });