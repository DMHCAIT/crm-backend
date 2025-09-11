// Students API - Full CRUD operations
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
    // Handle GET - Retrieve students
    if (req.method === 'GET') {
      try {
        const { data: students, error } = await supabase
          .from('students')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          // Return empty array if table doesn't exist
          console.log('Students table not found, returning empty array');
          return res.json({
            success: true,
            data: [],
            count: 0,
            message: 'Students table is being initialized'
          });
        }

        return res.json({
          success: true,
          data: students || [],
          count: students?.length || 0
        });
      } catch (err) {
        // Fallback response
        return res.json({
          success: true,
          data: [],
          count: 0,
          message: 'Students system initializing'
        });
      }
    }

    // Handle POST - Create new student
    if (req.method === 'POST') {
      const { 
        name, 
        email, 
        phone, 
        course, 
        enrollment_date,
        payment_status = 'pending',
        status = 'active',
        address,
        emergency_contact,
        notes
      } = req.body;

      // Validate required fields
      if (!name || !email || !course) {
        return res.status(400).json({ 
          error: 'Name, email, and course are required' 
        });
      }

      // Save student to Supabase
      const { data: student, error } = await supabase
        .from('students')
        .insert([{
          name,
          email,
          phone,
          course,
          enrollment_date: enrollment_date || new Date().toISOString(),
          payment_status,
          status,
          address,
          emergency_contact,
          notes
        }])
        .select()
        .single();

      if (error) throw error;

      // Log activity
      await supabase
        .from('activities')
        .insert([{
          type: 'student_enrolled',
          description: `New student enrolled: ${name}`,
          entity_type: 'student',
          entity_id: student.id,
          data: { course, enrollment_date }
        }]);

      return res.status(201).json({
        success: true,
        message: 'Student enrolled successfully',
        data: student
      });
    }

    // Handle PUT - Update student
    if (req.method === 'PUT') {
      const { id } = req.query;
      const updateData = req.body;

      if (!id) {
        return res.status(400).json({ error: 'Student ID is required' });
      }

      const { data: student, error } = await supabase
        .from('students')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Log activity
      await supabase
        .from('activities')
        .insert([{
          type: 'student_updated',
          description: `Student updated: ${student.name}`,
          entity_type: 'student',
          entity_id: student.id,
          data: updateData
        }]);

      return res.json({
        success: true,
        message: 'Student updated successfully',
        data: student
      });
    }

    // Handle DELETE - Delete student
    if (req.method === 'DELETE') {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ error: 'Student ID is required' });
      }

      // Get student info before deletion
      const { data: student } = await supabase
        .from('students')
        .select('name')
        .eq('id', id)
        .single();

      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Log activity
      if (student) {
        await supabase
          .from('activities')
          .insert([{
            type: 'student_deleted',
            description: `Student deleted: ${student.name}`,
            entity_type: 'student',
            entity_id: id
          }]);
      }

      return res.json({
        success: true,
        message: 'Student deleted successfully'
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Students API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
};
