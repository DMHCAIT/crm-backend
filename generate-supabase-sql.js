const fs = require('fs');
const csv = require('csv-parser');

// Path to your CSV file
const csvFilePath = '/Users/rubeenakhan/Downloads/CRM/IBMP-clean.csv';

// Standardization functions
function standardizeQualification(qualification) {
  if (!qualification) return 'Others';
  
  const qual = qualification.toString().toLowerCase().trim();
  
  if (qual.includes('mbbs') || qual.includes('fmg')) return 'MBBS/ FMG';
  if (qual.includes('md') || qual.includes('ms') || qual.includes('dnb')) return 'MD/MS/DNB';
  if (qual.includes('mch') || qual.includes('dm') || qual.includes('dnb-ss')) return 'Mch/ DM/ DNB-SS';
  if (qual.includes('bds') || qual.includes('mds')) return 'BDS/MDS';
  if (qual.includes('ayush') || qual.includes('bams') || qual.includes('bhms')) return 'AYUSH';
  
  return 'Others';
}

function standardizeCourseName(course, qualification) {
  if (!course) return 'General Medicine';
  
  // Clean the course name
  let cleanCourse = course.trim();
  
  // Remove prefixes to get core course name
  cleanCourse = cleanCourse.replace(/^(Fellowship in |PG Diploma in )/i, '');
  
  // Truncate to fit database constraints (15 chars for safety)
  if (cleanCourse.length > 15) {
    cleanCourse = cleanCourse.substring(0, 15).trim();
  }
  
  return cleanCourse;
}

function standardizeStatus(status) {
  if (!status) return 'Fresh';
  
  const stat = status.toString().toLowerCase().trim();
  
  if (stat.includes('follow') || stat.includes('followup')) return 'Follow Up';
  if (stat.includes('warm')) return 'Warm';
  if (stat.includes('hot')) return 'Hot';
  if (stat.includes('enrolled') || stat.includes('admission')) return 'Enrolled';
  if (stat.includes('not interested') || stat.includes('not ans')) return 'Not Interested';
  if (stat.includes('junk')) return 'Junk';
  
  return 'Fresh';
}

function cleanPhoneNumber(phone) {
  if (!phone || phone.toString().trim() === '') return null;
  
  let cleanPhone = phone.toString().trim();
  
  // Handle scientific notation (e.g., 2.01E+11)
  if (cleanPhone.includes('E+')) {
    const num = parseFloat(cleanPhone);
    if (!isNaN(num)) {
      cleanPhone = num.toString();
    }
  }
  
  // Remove any non-digit characters except +
  cleanPhone = cleanPhone.replace(/[^\d+]/g, '');
  
  // If it's too long or looks like masked data, return null
  if (cleanPhone.length > 15 || cleanPhone.includes('000000000')) {
    return null;
  }
  
  // Add + if it doesn't have it and looks like international number
  if (cleanPhone.length > 10 && !cleanPhone.startsWith('+')) {
    cleanPhone = '+' + cleanPhone;
  }
  
  return cleanPhone;
}

function escapeSQL(str) {
  if (!str) return 'NULL';
  // Escape single quotes and return quoted string
  return "'" + str.toString().replace(/'/g, "''") + "'";
}

function createNotesJSON(notes) {
  if (!notes || notes.trim() === '') {
    notes = 'Imported from IBMP database';
  }
  
  // Truncate notes to reasonable length
  if (notes.length > 200) {
    notes = notes.substring(0, 200).trim() + '...';
  }
  
  const noteId = 'note-' + Date.now() + Math.floor(Math.random() * 1000);
  const timestamp = new Date().toISOString();
  
  const noteObj = {
    id: noteId,
    content: notes,
    author: "IBMP Import",
    timestamp: timestamp,
    note_type: "general"
  };
  
  return JSON.stringify([noteObj]);
}

async function generateSQLScript() {
  console.log('🚀 Starting IBMP leads SQL generation for your database schema...');
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
          fullName: row['Full Name'] ? row['Full Name'].trim().substring(0, 50) : '',
          email: (row['Email '] || row['Email']) ? (row['Email '] || row['Email']).trim().substring(0, 100) : '',
          phone: cleanPhoneNumber(row['Phone']),
          country: row['Country'] ? row['Country'].trim().substring(0, 10) : '',
          qualification: standardizeQualification(row['Qualification']),
          course: standardizeCourseName((row['Course '] || row['Course']) ? (row['Course '] || row['Course']).trim() : '', standardizeQualification(row['Qualification'])),
          status: standardizeStatus(row['Status']),
          assignedTo: row['Assigned to'] ? row['Assigned to'].trim().substring(0, 15) : 'Unassigned',
          notes: createNotesJSON(row['Notes'] ? row['Notes'].trim() : ''),
          source: 'IBMP'
        };
        
        leads.push(lead);
        
        // Progress logging
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
        
        // Generate SQL INSERT statements for your schema
        console.log('🔄 Generating SQL INSERT statements...');
        
        sqlStatements.push('-- IBMP Leads Import SQL Script for Your Database Schema');
        sqlStatements.push('-- Generated on: ' + new Date().toISOString());
        sqlStatements.push('-- Total leads: ' + leads.length);
        sqlStatements.push('-- Matches your exact table structure with proper JSON notes');
        sqlStatements.push('');
        
        for (let i = 0; i < leads.length; i++) {
          const lead = leads[i];
          
          const sqlInsert = `INSERT INTO "public"."leads" (
    "fullName", 
    "email", 
    "phone", 
    "country", 
    "qualification", 
    "course", 
    "status", 
    "assignedTo", 
    "source",
    "notes",
    "priority",
    "score",
    "experience",
    "location",
    "communicationscount",
    "assigned_to",
    "assignedcounselor",
    "tags",
    "custom_fields",
    "createdAt",
    "updatedAt",
    "created_at",
    "updated_at",
    "updated_by"
) VALUES (
    ${escapeSQL(lead.fullName)},
    ${escapeSQL(lead.email)},
    ${lead.phone ? escapeSQL(lead.phone) : 'NULL'},
    ${escapeSQL(lead.country)},
    ${escapeSQL(lead.qualification)},
    ${escapeSQL(lead.course)},
    ${escapeSQL(lead.status)},
    ${escapeSQL(lead.assignedTo)},
    ${escapeSQL(lead.source)},
    '${lead.notes.replace(/'/g, "''")}',
    'medium',
    '50',
    'Not specified',
    'Not specified',
    '0',
    ${escapeSQL(lead.assignedTo)},
    ${escapeSQL(lead.assignedTo)},
    NULL,
    '{}',
    now(),
    now(),
    now(),
    now(),
    'System'
);`;
          
          sqlStatements.push(sqlInsert);
          
          if ((i + 1) % 100 === 0) {
            console.log('✅ Generated SQL for ' + (i + 1) + ' leads...');
          }
        }
        
        // Write SQL script to file
        const sqlScript = sqlStatements.join('\n');
        const outputFile = '/Users/rubeenakhan/Downloads/CRM/ibmp-leads-supabase.sql';
        
        fs.writeFileSync(outputFile, sqlScript);
        
        console.log('\n🎉 SQL script generation completed!');
        console.log('📄 SQL file saved to: ' + outputFile);
        console.log('📊 Total leads processed: ' + leads.length);
        console.log('\n📋 Script Features:');
        console.log('✅ Matches your exact database schema');
        console.log('✅ Proper JSON format for notes field');
        console.log('✅ All required fields populated with defaults');
        console.log('✅ Standardized qualification and status values');
        console.log('✅ Phone number cleaning and formatting');
        console.log('✅ Field length constraints respected');
        console.log('\n📋 Next steps:');
        console.log('1. Copy the SQL file content');
        console.log('2. Paste into Supabase SQL Editor');
        console.log('3. Execute to import all leads');
        
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