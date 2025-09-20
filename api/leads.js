// 🚀 SUPABASE-CONNECTED LEADS API
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

const JWT_SECRET = process.env.JWT_SECRET || 'dmhca-crm-super-secret-production-key-2024';

// Initialize Supabase
let supabase;
try {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    console.log('✅ Leads API: Supabase initialized');
  } else {
    console.log('❌ Leads API: Supabase credentials missing');
  }
} catch (error) {
  console.log('❌ Leads API: Supabase initialization failed:', error.message);
}

// Configuration options
const STATUS_OPTIONS = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed-won', 'closed-lost'];
const PRIORITY_OPTIONS = ['low', 'medium', 'high', 'urgent'];
const SOURCE_OPTIONS = ['Website', 'Social Media', 'Referral', 'Email Campaign', 'Cold Call', 'Event', 'Partner'];

// Countries (comprehensive list)
const COUNTRIES = [
  'Afghanistan', 'Albania', 'Algeria', 'Argentina', 'Armenia', 'Australia', 
  'Austria', 'Azerbaijan', 'Bahrain', 'Bangladesh', 'Belarus', 'Belgium',
  'Bolivia', 'Bosnia and Herzegovina', 'Brazil', 'Bulgaria', 'Cambodia', 'Canada',
  'Chile', 'China', 'Colombia', 'Costa Rica', 'Croatia', 'Cyprus', 'Czech Republic',
  'Denmark', 'Ecuador', 'Egypt', 'Estonia', 'Ethiopia', 'Finland', 'France',
  'Georgia', 'Germany', 'Ghana', 'Greece', 'Guatemala', 'Hungary', 'Iceland',
  'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy', 'Japan',
  'Jordan', 'Kazakhstan', 'Kenya', 'Kuwait', 'Latvia', 'Lebanon', 'Lithuania',
  'Luxembourg', 'Malaysia', 'Mexico', 'Morocco', 'Netherlands', 'New Zealand',
  'Nigeria', 'Norway', 'Pakistan', 'Peru', 'Philippines', 'Poland', 'Portugal',
  'Qatar', 'Romania', 'Russia', 'Saudi Arabia', 'Singapore', 'Slovakia', 'Slovenia',
  'South Africa', 'South Korea', 'Spain', 'Sri Lanka', 'Sweden', 'Switzerland',
  'Thailand', 'Turkey', 'UAE', 'Ukraine', 'United Kingdom', 'United States',
  'Uruguay', 'Venezuela', 'Vietnam'
];

// Qualification options
const QUALIFICATION_OPTIONS = [
  'High School', 'Associate Degree', 'Bachelor\'s Degree', 'Master\'s Degree',
  'PhD', 'Professional Certification', 'Other'
];

// Course options (Fellowship and PG Diploma)
const COURSE_OPTIONS = [
  // Fellowship Programs
  'Aesthetic Medicine', 'Anesthesia', 'Cardiology', 'Critical Care Medicine',
  'Dermatology', 'Emergency Medicine', 'Endocrinology', 'Family Medicine',
  'Gastroenterology', 'General Surgery', 'Geriatrics', 'Hematology',
  'Infectious Diseases', 'Internal Medicine', 'Nephrology', 'Neurology',
  'Obstetrics and Gynecology', 'Oncology', 'Ophthalmology', 'Orthopedics',
  'Otolaryngology', 'Pathology', 'Pediatrics', 'Plastic Surgery',
  'Psychiatry', 'Pulmonology', 'Radiology', 'Rheumatology', 'Urology',
  // PG Diploma Programs  
  'Clinical Research', 'Hospital Administration', 'Medical Education',
  'Public Health', 'Epidemiology'
];

function verifyToken(req) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) throw new Error('No token provided');
  
  const decoded = jwt.verify(token, JWT_SECRET);
  return decoded;
}

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const user = verifyToken(req);
    
    if (req.method === 'GET') {
      if (!supabase) {
        return res.status(500).json({
          success: false,
          error: 'Database connection not available',
          message: 'Supabase not initialized'
        });
      }

      try {
        // Get all leads from database
        const { data: leads, error } = await supabase
          .from('leads')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('❌ Error fetching leads:', error.message);
          return res.status(500).json({
            success: false,
            error: 'Failed to fetch leads',
            details: error.message
          });
        }

        return res.json({
          success: true,
          leads: leads || [],
          totalCount: leads?.length || 0,
          config: {
            statusOptions: STATUS_OPTIONS,
            priorityOptions: PRIORITY_OPTIONS,
            sourceOptions: SOURCE_OPTIONS,
            countries: COUNTRIES,
            qualificationOptions: QUALIFICATION_OPTIONS,
            courseOptions: COURSE_OPTIONS
          },
          message: `Found ${leads?.length || 0} leads`
        });
      } catch (error) {
        console.error('❌ Database error:', error.message);
        return res.status(500).json({
          success: false,
          error: 'Database operation failed',
          details: error.message
        });
      }
    }

    if (req.method === 'POST') {
      if (!supabase) {
        return res.status(500).json({
          success: false,
          error: 'Database connection not available',
          message: 'Supabase not initialized'
        });
      }

      // Extract lead data
      const { 
        fullName, 
        email, 
        phone, 
        country, 
        qualification, 
        source, 
        course, 
        status,
        priority,
        assignedTo,
        notes,
        experience,
        location
      } = req.body;

      // Validate required fields
      if (!fullName || !email) {
        return res.status(400).json({
          success: false,
          error: 'Full name and email are required'
        });
      }

      try {
        // Prepare lead data for database (matching exact schema)
        const leadData = {
          fullName: fullName,
          name: fullName, // Backup field
          email: email,
          phone: phone || '',
          country: country || 'India',
          source: source || 'Manual Entry',
          course: course || 'Emergency Medicine',
          status: status || 'new',
          priority: priority || 'medium',
          assigned_to: assignedTo || user.username || 'Unassigned',
          assignedCounselor: assignedTo || user.username || 'Unassigned',
          notes: notes || 'New lead created via API',
          experience: experience || 'Not specified',
          location: location || 'Not specified',
          score: 0,
          communicationsCount: 0,
          createdBy: user.username || 'System',
          createdAt: new Date().toISOString(),
          lastContact: new Date().toISOString(),
          last_contact: new Date().toISOString(),
          nextFollowUp: null,
          next_follow_up: null
        };

        // Insert into database
        const { data: insertedLead, error } = await supabase
          .from('leads')
          .insert(leadData)
          .select()
          .single();

        if (error) {
          console.error('❌ Error creating lead:', error.message);
          return res.status(500).json({
            success: false,
            error: 'Failed to create lead',
            details: error.message
          });
        }

        console.log(`✅ Created new lead in database: ${fullName} (${email}) - ID: ${insertedLead.id}`);

        return res.json({
          success: true,
          data: {
            id: insertedLead.id,
            fullName: insertedLead.fullName,
            email: insertedLead.email,
            phone: insertedLead.phone,
            country: insertedLead.country,
            source: insertedLead.source,
            course: insertedLead.course,
            status: insertedLead.status,
            priority: insertedLead.priority,
            assignedTo: insertedLead.assigned_to,
            notes: insertedLead.notes,
            createdAt: insertedLead.createdAt
          },
          message: 'Lead created successfully in database'
        });
      } catch (error) {
        console.error('❌ Database error creating lead:', error.message);
        return res.status(500).json({
          success: false,
          error: 'Database operation failed',
          details: error.message
        });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
    
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: error.message
    });
  }
};