// Enhanced leads API with Google Sheets support
const { createClient } = require('@supabase/supabase-js');

let supabase;
try {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
  }
} catch (error) {
  console.log('Leads module: Supabase initialization failed:', error.message);
}

// Helper function for email validation
const isValidEmail = (email) => {
  if (!email) return true; // Optional field
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Helper function for phone validation
const isValidPhone = (phone) => {
  if (!phone) return true; // Optional field
  const phoneRegex = /^[\d\s+()-]{7,20}$/;
  return phoneRegex.test(phone);
};

const normalizePhone = (phone) => {
  if (!phone) return '';
  const cleaned = String(phone).trim().replace(/^p:\s*/i, '');
  return cleaned;
};

const isTestValue = (value) => {
  if (!value) return false;
  const text = String(value).toLowerCase();
  return text.includes('<test lead:') || text.includes('dummy data') || text === 'test@meta.com';
};

const isWebhookPath = (req) => req.url.includes('/google-sheet-webhook');

const getWebhookSecret = (req) => (
  req.headers['x-webhook-secret'] ||
  req.headers['x-google-webhook-secret'] ||
  req.body?.secret ||
  ''
);

const mapWebhookPayloadToLead = (payload) => {
  const row = payload?.lead || payload?.row || payload || {};

  const fullName = row.fullName || row.name || row.full_name || '';
  const email = row.email || row.email_address || '';
  const phone = normalizePhone(row.phone || row.phone_number || row.mobile || '');
  const qualification = row.qualification || row.your_highest_qualification || '';
  const course = row.course ||
    row.course_interest ||
    row.in_which_program_are_you_interested_ ||
    row['in_which_program_are_you_interested_?'] ||
    '';
  const source = row.source || row.form_name || 'google_sheets';
  const status = row.status || row.lead_status || 'new';

  return {
    fullName,
    email,
    phone,
    country: row.country || '',
    branch: row.branch || '',
    qualification,
    source,
    course,
    status,
    assignedTo: row.assignedTo || null,
    followUp: row.followUp || null,
    priority: row.priority || 'medium',
    notes: row.notes || '',
    score: Number(row.score) || 0,
    company: row.company || '',
    city: row.city || '',
    designation: row.designation || ''
  };
};

module.exports = async (req, res) => {
  // CORS headers
  const allowedOrigins = [
    'https://www.crmdmhca.com',
    'https://crmdmhca.com',
    'https://crm-frontend-final-nnmy850zp-dmhca.vercel.app',
    'https://crm-frontend-final.vercel.app',
    'http://localhost:5173',
    'http://localhost:5174'
  ];

  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Google Sheets webhook endpoint (public but secret-protected)
    if (isWebhookPath(req)) {
      if (req.method === 'GET') {
        return res.json({
          success: true,
          message: 'Google Sheets webhook endpoint is active'
        });
      }

      if (req.method !== 'POST') {
        return res.status(405).json({
          success: false,
          error: 'Method not allowed for webhook endpoint'
        });
      }

      const expectedSecret = process.env.GOOGLE_SHEETS_WEBHOOK_SECRET || process.env.WEBHOOK_SECRET;
      if (!expectedSecret) {
        return res.status(500).json({
          success: false,
          error: 'Webhook secret is not configured'
        });
      }

      const incomingSecret = getWebhookSecret(req);
      if (!incomingSecret || incomingSecret !== expectedSecret) {
        return res.status(401).json({
          success: false,
          error: 'Invalid webhook secret'
        });
      }

      if (!supabase) {
        return res.status(503).json({
          success: false,
          error: 'Database not configured',
          message: 'Supabase connection is not available. Please check environment variables.'
        });
      }

      const leadData = mapWebhookPayloadToLead(req.body);

      if (!leadData.fullName && !leadData.email && !leadData.phone) {
        return res.status(400).json({
          success: false,
          error: 'At least one identifier (name/email/phone) is required'
        });
      }

      if (isTestValue(leadData.fullName) || isTestValue(leadData.email)) {
        return res.json({
          success: true,
          action: 'skipped',
          message: 'Test lead skipped'
        });
      }

      if (leadData.email && !isValidEmail(leadData.email)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid email format'
        });
      }

      if (leadData.phone && !isValidPhone(leadData.phone)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid phone format'
        });
      }

      let duplicateQuery = supabase.from('leads').select('id').limit(1);
      if (leadData.email && leadData.phone) {
        duplicateQuery = duplicateQuery.or(`email.eq.${leadData.email},phone.eq.${leadData.phone}`);
      } else if (leadData.email) {
        duplicateQuery = duplicateQuery.eq('email', leadData.email);
      } else {
        duplicateQuery = duplicateQuery.eq('phone', leadData.phone);
      }

      const { data: existingLeads, error: lookupError } = await duplicateQuery;
      if (lookupError) {
        return res.status(500).json({
          success: false,
          error: 'Failed to lookup existing lead',
          message: lookupError.message
        });
      }

      if (existingLeads && existingLeads.length > 0) {
        const leadId = existingLeads[0].id;
        const { data: updatedLead, error: updateError } = await supabase
          .from('leads')
          .update({
            ...leadData,
            updatedAt: new Date().toISOString()
          })
          .eq('id', leadId)
          .select()
          .single();

        if (updateError) {
          return res.status(500).json({
            success: false,
            error: 'Failed to update lead',
            message: updateError.message
          });
        }

        return res.json({
          success: true,
          action: 'updated',
          data: updatedLead
        });
      }

      const { data: createdLead, error: insertError } = await supabase
        .from('leads')
        .insert([leadData])
        .select()
        .single();

      if (insertError) {
        return res.status(500).json({
          success: false,
          error: 'Failed to create lead',
          message: insertError.message
        });
      }

      return res.status(201).json({
        success: true,
        action: 'created',
        data: createdLead
      });
    }

    // Check if Supabase is initialized
    if (!supabase) {
      return res.status(503).json({
        success: false,
        error: 'Database not configured',
        message: 'Supabase connection is not available. Please check environment variables.'
      });
    }

    // Handle GET - Retrieve leads with optional filters
    if (req.method === 'GET') {
      try {
        const { email, phone, status, source, limit = 50, offset = 0 } = req.query;

        // Validate and parse pagination parameters
        const parsedLimit = Math.min(Math.max(parseInt(limit) || 50, 1), 1000);
        const parsedOffset = Math.max(parseInt(offset) || 0, 0);

        // Build query with pagination
        let query = supabase
          .from('leads')
          .select('*', { count: 'exact' })
          .range(parsedOffset, parsedOffset + parsedLimit - 1)
          .order('createdAt', { ascending: false });

        // Apply filters if provided (for duplicate checking)
        if (email) {
          query = query.eq('email', email);
        }
        if (phone) {
          query = query.eq('phone', phone);
        }
        if (status) {
          query = query.eq('status', status);
        }
        if (source) {
          query = query.ilike('source', `%${source}%`);
        }

        const { data: leads, error, count } = await query;

        if (error) {
          console.error('❌ Leads query error:', error.message);
          return res.status(500).json({
            success: false,
            error: 'Database query failed',
            message: `Database error: ${error.message}`,
            details: 'Please check Supabase dashboard and ensure leads table exists with correct columns'
          });
        }

        return res.json({
          success: true,
          data: leads || [],
          count: leads?.length || 0,
          total: count,
          limit: parsedLimit,
          offset: parsedOffset
        });
      } catch (dbError) {
        console.error('❌ Database error in GET:', dbError);
        return res.status(500).json({
          success: false,
          error: 'Database error',
          message: dbError.message || 'Failed to retrieve leads'
        });
      }
    }

    // Handle POST - Create new lead
    if (req.method === 'POST') {
      const requestData = req.body;

      // Support both old and new field names
      const fullName = requestData.fullName || requestData.name;
      const email = requestData.email;
      const phone = requestData.phone;
      const country = requestData.country;
      const branch = requestData.branch;
      const qualification = requestData.qualification;
      const source = requestData.source || 'manual';
      const course = requestData.course || requestData.course_interest;
      const assignedTo = requestData.assignedTo;
      const followUp = requestData.followUp;
      const priority = requestData.priority || 'medium';
      const notes = requestData.notes;
      const status = requestData.status || 'new';
      const score = requestData.score || 0;

      // New fields from Google Sheets / Facebook
      const adName = requestData.ad_name || requestData.adName;
      const campaignName = requestData.campaign_name || requestData.campaignName;
      const company = requestData.company;
      const city = requestData.city;
      const designation = requestData.designation;

      // Validate required fields
      if (!fullName && !email) {
        return res.status(400).json({
          success: false,
          error: 'At least name or email is required'
        });
      }

      // Validate email format
      if (email && !isValidEmail(email)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid email format'
        });
      }

      // Validate phone format
      if (phone && !isValidPhone(phone)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid phone format'
        });
      }

      // Check for duplicates if email or phone provided
      if (email || phone) {
        try {
          let duplicateQuery = supabase.from('leads').select('id, email, phone');

          if (email && phone) {
            duplicateQuery = duplicateQuery.or(`email.eq.${email},phone.eq.${phone}`);
          } else if (email) {
            duplicateQuery = duplicateQuery.eq('email', email);
          } else if (phone) {
            duplicateQuery = duplicateQuery.eq('phone', phone);
          }

          const { data: existingLeads, error: duplicateError } = await duplicateQuery;

          if (!duplicateError && existingLeads && existingLeads.length > 0) {
            return res.status(409).json({
              success: false,
              error: 'Duplicate lead detected',
              message: 'A lead with this email or phone already exists',
              existingLead: existingLeads[0]
            });
          }
        } catch (duplicateCheckError) {
          console.warn('⚠️ Duplicate check failed:', duplicateCheckError.message);
          // Continue with insertion even if duplicate check fails
        }
      }

      try {
        // Build enhanced notes with campaign tracking data
        let enhancedNotes = notes || '';
        if (adName) {
          enhancedNotes += `${enhancedNotes ? '\n' : ''}Ad: ${adName}`;
        }
        if (campaignName) {
          enhancedNotes += `${enhancedNotes ? '\n' : ''}Campaign: ${campaignName}`;
        }

        // Create lead data matching the schema
        const leadData = {
          fullName: fullName || '',
          email: email || '',
          phone: phone || '',
          country: country || '',
          branch: branch || '',
          qualification: qualification || '',
          source,
          course: course || '',
          status,
          assignedTo: assignedTo || null,
          followUp: followUp || null,
          priority,
          notes: enhancedNotes,
          score: score || 0,
          // New fields
          company: company || '',
          city: city || '',
          designation: designation || ''
        };

        const { data: lead, error } = await supabase
          .from('leads')
          .insert([leadData])
          .select()
          .single();

        if (error) {
          console.log('❌ Lead insertion error:', error.message);
          return res.status(500).json({
            success: false,
            error: 'Database error during lead creation',
            message: `Database error: ${error.message}`,
            details: error.details || 'Lead creation failed. Please check the data and try again.'
          });
        }

        return res.status(201).json({
          success: true,
          message: 'Lead captured successfully',
          data: lead
        });

      } catch (dbError) {
        console.error('Database error:', dbError);
        // Fallback response
        return res.status(500).json({
          success: false,
          error: 'Database error',
          message: dbError.message
        });
      }
    }

    // Handle PUT - Update lead
    if (req.method === 'PUT') {
      const leadId = req.query.id || req.params?.id;

      if (!leadId) {
        return res.status(400).json({
          success: false,
          error: 'Lead ID is required for update'
        });
      }

      const updateData = { ...req.body };
      delete updateData.id; // Remove ID from update data

      // Handle field name mapping for legacy support
      if (updateData.name && !updateData.fullName) {
        updateData.fullName = updateData.name;
        delete updateData.name;
      }
      if (updateData.course_interest && !updateData.course) {
        updateData.course = updateData.course_interest;
        delete updateData.course_interest;
      }

      // Validate email if being updated
      if (updateData.email && !isValidEmail(updateData.email)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid email format'
        });
      }

      // Validate phone if being updated
      if (updateData.phone && !isValidPhone(updateData.phone)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid phone format'
        });
      }

      // Update timestamp
      updateData.updatedAt = new Date().toISOString();

      try {
        const { data: updatedLead, error } = await supabase
          .from('leads')
          .update(updateData)
          .eq('id', leadId)
          .select()
          .single();

        if (error) {
          console.error('❌ Lead update error:', error.message);
          return res.status(404).json({
            success: false,
            error: 'Lead not found or update failed',
            message: error.message
          });
        }

        return res.json({
          success: true,
          message: 'Lead updated successfully',
          data: updatedLead
        });

      } catch (dbError) {
        console.error('❌ Database error during update:', dbError);
        return res.status(500).json({
          success: false,
          error: 'Database error during update',
          message: dbError.message
        });
      }
    }

    // Handle DELETE - Delete lead
    if (req.method === 'DELETE') {
      const leadId = req.query.id || req.params?.id;

      if (!leadId) {
        return res.status(400).json({
          success: false,
          error: 'Lead ID is required for deletion'
        });
      }

      try {
        const { data: deletedLead, error } = await supabase
          .from('leads')
          .delete()
          .eq('id', leadId)
          .select()
          .single();

        if (error) {
          console.error('❌ Lead deletion error:', error.message);
          return res.status(404).json({
            success: false,
            error: 'Lead not found or deletion failed',
            message: error.message
          });
        }

        return res.json({
          success: true,
          message: 'Lead deleted successfully',
          data: deletedLead
        });

      } catch (dbError) {
        console.error('❌ Database error during deletion:', dbError);
        return res.status(500).json({
          success: false,
          error: 'Database error during deletion',
          message: dbError.message
        });
      }
    }

    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      message: `${req.method} method is not supported on this endpoint`
    });

  } catch (error) {
    console.error('Leads API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Please check database configuration'
    });
  }
};
