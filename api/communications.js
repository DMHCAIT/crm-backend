// Communications API - Full CRUD operations
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Handle GET - Retrieve communications
    if (req.method === 'GET') {
      const { lead_id, student_id, type, limit = 50 } = req.query;
      
      try {
        let query = supabase
          .from('communications')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(parseInt(limit));

        // Apply filters
        if (lead_id) query = query.eq('lead_id', lead_id);
        if (student_id) query = query.eq('student_id', student_id);
        if (type) query = query.eq('type', type);

        const { data: communications, error } = await query;

        if (error) {
          // Return empty array if table doesn't exist
          console.log('Communications table not found, returning empty array');
          return res.json({
            success: true,
            data: [],
            count: 0,
            message: 'Communications table is being initialized'
          });
        }

        return res.json({
          success: true,
          data: communications || [],
          count: communications?.length || 0
        });
      } catch (err) {
        // Fallback response
        return res.json({
          success: true,
          data: [],
          count: 0,
          message: 'Communications system initializing'
        });
      }
    }

    // Handle POST - Create new communication
    if (req.method === 'POST') {
      const { 
        type, // 'email', 'whatsapp', 'sms', 'call', 'meeting'
        direction, // 'inbound', 'outbound'
        subject,
        content,
        recipient,
        sender,
        status = 'sent',
        lead_id,
        student_id,
        scheduled_at,
        sent_at = new Date().toISOString()
      } = req.body;

      // Validate required fields
      if (!type || !direction || !content) {
        return res.status(400).json({ 
          error: 'Type, direction, and content are required' 
        });
      }

      // Save communication to Supabase
      const { data: communication, error } = await supabase
        .from('communications')
        .insert([{
          type,
          direction,
          subject,
          content,
          recipient,
          sender,
          status,
          lead_id,
          student_id,
          scheduled_at,
          sent_at
        }])
        .select()
        .single();

      if (error) throw error;

      // Log activity
      await supabase
        .from('activities')
        .insert([{
          type: 'communication_created',
          description: `${type.toUpperCase()} ${direction}: ${subject || content.substring(0, 50)}`,
          entity_type: 'communication',
          entity_id: communication.id,
          data: { type, direction, recipient }
        }]);

      return res.status(201).json({
        success: true,
        message: 'Communication logged successfully',
        data: communication
      });
    }

    // Handle PUT - Update communication
    if (req.method === 'PUT') {
      const { id } = req.query;
      const updateData = req.body;

      if (!id) {
        return res.status(400).json({ error: 'Communication ID is required' });
      }

      const { data: communication, error } = await supabase
        .from('communications')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return res.json({
        success: true,
        message: 'Communication updated successfully',
        data: communication
      });
    }

    // Handle DELETE - Delete communication
    if (req.method === 'DELETE') {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ error: 'Communication ID is required' });
      }

      const { error } = await supabase
        .from('communications')
        .delete()
        .eq('id', id);

      if (error) throw error;

      return res.json({
        success: true,
        message: 'Communication deleted successfully'
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Communications API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
};
