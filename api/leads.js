// Leads API - Support both GET and POST
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = async (req, res) => {
  // Set CORS headers for production domain
  const allowedOrigins = [
    'https://www.crmdmhca.com', 
    'https://crmdmhca.com', 
    'https://crm-frontend-final-nnmy850zp-dmhca.vercel.app',
    'http://localhost:5173'
  ];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Handle GET - Retrieve leads
    if (req.method === 'GET') {
      const { data: leads, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return res.json({
        success: true,
        data: leads || [],
        count: leads?.length || 0
      });
    }

    // Handle POST - Create new lead
    if (req.method === 'POST') {
      const { name, email, phone, course_interest, source = 'website', company, budget } = req.body;

      // Validate required fields
      if (!name || !email) {
        return res.status(400).json({ 
          error: 'Name and email are required' 
        });
      }

      // Save lead to Supabase
      const { data: lead, error } = await supabase
        .from('leads')
        .insert([{
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
        }])
        .select()
        .single();

      if (error) throw error;

      // Log activity
      await supabase
        .from('activities')
        .insert([{
          type: 'lead_captured',
          description: `New lead captured: ${name}`,
          entity_type: 'lead',
          entity_id: lead.id,
          data: { source, course_interest }
        }]);

      return res.status(201).json({
        success: true,
        message: 'Lead captured successfully',
        data: lead
      });
    }

    // Handle PUT - Update lead
    if (req.method === 'PUT') {
      const { id } = req.query;
      const updateData = req.body;

      if (!id) {
        return res.status(400).json({ error: 'Lead ID is required' });
      }

      const { data: lead, error } = await supabase
        .from('leads')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return res.json({
        success: true,
        message: 'Lead updated successfully',
        data: lead
      });
    }

    // Handle DELETE - Delete lead
    if (req.method === 'DELETE') {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ error: 'Lead ID is required' });
      }

      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', id);

      if (error) throw error;

      return res.json({
        success: true,
        message: 'Lead deleted successfully'
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Leads API error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};
