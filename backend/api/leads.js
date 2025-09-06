// Vercel Serverless API for Lead Capture
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = async (req, res) => {
  // Set CORS headers for production domain
  const allowedOrigins = ['https://www.crmdmhca.com', 'https://crmdmhca.com', 'http://localhost:5173'];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
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

    res.status(201).json({
      success: true,
      message: 'Lead captured successfully',
      leadId: lead.id
    });

  } catch (error) {
    console.error('Lead capture error:', error);
    res.status(500).json({
      error: 'Failed to capture lead',
      details: error.message
    });
  }
};
