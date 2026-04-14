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

// Backward compatibility for frontend code expecting `name`
const normalizeLeadForFrontend = (lead) => {
  if (!lead || typeof lead !== 'object') return lead;
  const normalized = { ...lead };
  if (!normalized.name && normalized.fullName) {
    normalized.name = normalized.fullName;
  }
  return normalized;
};

module.exports = async (req, res) => {
  const isGoogleSheetsSync = req.path === '/api/leads/google-sync';

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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Browser check: sync is POST-only; avoid treating this public path as GET /api/leads
  if (req.method === 'GET' && isGoogleSheetsSync) {
    return res.status(200).json({
      success: true,
      message: 'Google Sheet sync endpoint is live. Use POST with JSON body and x-api-key header.',
      method: 'POST',
      contentType: 'application/json'
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

  try {
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
          data: (leads || []).map(normalizeLeadForFrontend),
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
      if (isGoogleSheetsSync) {
        const syncKey = req.headers['x-api-key'];
        if (!process.env.GOOGLE_SHEETS_SYNC_KEY || syncKey !== process.env.GOOGLE_SHEETS_SYNC_KEY) {
          return res.status(401).json({
            success: false,
            error: 'Unauthorized sync request'
          });
        }
      }

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
          data: normalizeLeadForFrontend(lead)
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
          data: normalizeLeadForFrontend(updatedLead)
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
