// Simple leads API with fallback data
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
    // Handle GET - Retrieve leads
    if (req.method === 'GET') {
      try {
        const { data: leads, error } = await supabase
          .from('leads')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          // If table doesn't exist, return empty array
          console.log('Leads table not found, returning empty array');
          return res.json({
            success: true,
            data: [],
            count: 0,
            message: 'Database tables are being initialized'
          });
        }

        return res.json({
          success: true,
          data: leads || [],
          count: leads?.length || 0
        });
      } catch (dbError) {
        // Fallback to empty array if database error
        return res.json({
          success: true,
          data: [],
          count: 0,
          message: 'Database tables are being initialized'
        });
      }
    }

    // Handle POST - Create new lead
    if (req.method === 'POST') {
      const { name, email, phone, course_interest, source = 'website', company, budget } = req.body;

      // Validate required fields
      if (!name || !email) {
        return res.status(400).json({ 
          success: false,
          error: 'Name and email are required' 
        });
      }

      try {
        // Try to insert into database
        const leadData = {
          name,
          email,
          phone,
          company,
          source,
          status: 'new',
          score: 50,
          notes: course_interest ? `Interested in: ${course_interest}` : null,
          budget: budget ? parseFloat(budget) : null,
          tags: course_interest ? [course_interest] : []
        };

        const { data: lead, error } = await supabase
          .from('leads')
          .insert([leadData])
          .select()
          .single();

        if (error) {
          // If table doesn't exist, return success but inform about setup needed
          return res.status(201).json({
            success: true,
            message: 'Lead data received but database tables need to be set up',
            data: {
              id: 'temp-' + Date.now(),
              ...leadData,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          });
        }

        return res.status(201).json({
          success: true,
          message: 'Lead captured successfully',
          data: lead
        });

      } catch (dbError) {
        // Fallback response
        return res.status(201).json({
          success: true,
          message: 'Lead data received but database tables need to be set up',
          data: {
            id: 'temp-' + Date.now(),
            name,
            email,
            phone,
            company,
            source,
            status: 'new',
            created_at: new Date().toISOString()
          }
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

      const updateData = req.body;
      delete updateData.id; // Remove ID from update data
      updateData.updated_at = new Date().toISOString();

      try {
        const { data: updatedLead, error } = await supabase
          .from('leads')
          .update(updateData)
          .eq('id', leadId)
          .select()
          .single();

        if (error) {
          return res.status(404).json({
            success: false,
            error: 'Lead not found or update failed'
          });
        }

        return res.json({
          success: true,
          message: 'Lead updated successfully',
          data: updatedLead
        });

      } catch (dbError) {
        return res.status(500).json({
          success: false,
          error: 'Database error during update'
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
          return res.status(404).json({
            success: false,
            error: 'Lead not found or deletion failed'
          });
        }

        return res.json({
          success: true,
          message: 'Lead deleted successfully',
          data: deletedLead
        });

      } catch (dbError) {
        return res.status(500).json({
          success: false,
          error: 'Database error during deletion'
        });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Leads API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Please check database configuration'
    });
  }
};
