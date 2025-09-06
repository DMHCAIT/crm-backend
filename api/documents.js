// Documents API - Full CRUD operations with file upload
const { createClient } = require('@supabase/supabase-js');
const multer = require('multer');
const path = require('path');

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/gif',
      'text/plain'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'), false);
    }
  }
});

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
    // Handle GET - Retrieve documents
    if (req.method === 'GET') {
      const { lead_id, student_id, type, limit = 50 } = req.query;
      
      let query = supabase
        .from('documents')
        .select('*, leads(name), students(name)')
        .order('created_at', { ascending: false })
        .limit(parseInt(limit));

      // Apply filters
      if (lead_id) query = query.eq('lead_id', lead_id);
      if (student_id) query = query.eq('student_id', student_id);
      if (type) query = query.eq('type', type);

      const { data: documents, error } = await query;

      if (error) throw error;

      return res.json({
        success: true,
        data: documents || [],
        count: documents?.length || 0
      });
    }

    // Handle POST - Upload new document
    if (req.method === 'POST') {
      // Use multer middleware for file upload
      upload.single('file')(req, res, async (uploadError) => {
        if (uploadError) {
          return res.status(400).json({ 
            error: 'File upload error', 
            details: uploadError.message 
          });
        }

        const { 
          name,
          description,
          type = 'general', // 'certificate', 'transcript', 'id_proof', 'general'
          lead_id,
          student_id,
          category
        } = req.body;

        let fileUrl = null;
        let fileName = null;
        let fileSize = null;
        let mimeType = null;

        // Handle file upload to Supabase Storage if file is provided
        if (req.file) {
          fileName = `${Date.now()}_${req.file.originalname}`;
          fileSize = req.file.size;
          mimeType = req.file.mimetype;

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('documents')
            .upload(fileName, req.file.buffer, {
              contentType: req.file.mimetype,
              cacheControl: '3600'
            });

          if (uploadError) {
            console.error('File upload error:', uploadError);
            return res.status(500).json({ 
              error: 'Failed to upload file', 
              details: uploadError.message 
            });
          }

          // Get public URL
          const { data: urlData } = supabase.storage
            .from('documents')
            .getPublicUrl(fileName);
          
          fileUrl = urlData.publicUrl;
        }

        // Validate required fields
        if (!name) {
          return res.status(400).json({ 
            error: 'Document name is required' 
          });
        }

        // Save document record to database
        const { data: document, error } = await supabase
          .from('documents')
          .insert([{
            name,
            description,
            type,
            file_name: fileName,
            file_url: fileUrl,
            file_size: fileSize,
            mime_type: mimeType,
            lead_id,
            student_id,
            category,
            status: 'active'
          }])
          .select()
          .single();

        if (error) throw error;

        // Log activity
        await supabase
          .from('activities')
          .insert([{
            type: 'document_uploaded',
            description: `Document uploaded: ${name}`,
            entity_type: 'document',
            entity_id: document.id,
            data: { type, category, file_name: fileName }
          }]);

        return res.status(201).json({
          success: true,
          message: 'Document uploaded successfully',
          data: document
        });
      });
      
      return; // Don't continue execution after multer middleware
    }

    // Handle PUT - Update document
    if (req.method === 'PUT') {
      const { id } = req.query;
      const updateData = req.body;

      if (!id) {
        return res.status(400).json({ error: 'Document ID is required' });
      }

      const { data: document, error } = await supabase
        .from('documents')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return res.json({
        success: true,
        message: 'Document updated successfully',
        data: document
      });
    }

    // Handle DELETE - Delete document
    if (req.method === 'DELETE') {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ error: 'Document ID is required' });
      }

      // Get document info before deletion
      const { data: document } = await supabase
        .from('documents')
        .select('name, file_name')
        .eq('id', id)
        .single();

      // Delete file from storage if exists
      if (document?.file_name) {
        try {
          await supabase.storage
            .from('documents')
            .remove([document.file_name]);
        } catch (storageError) {
          console.warn('Storage deletion failed:', storageError);
        }
      }

      // Delete from database
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Log activity
      if (document) {
        await supabase
          .from('activities')
          .insert([{
            type: 'document_deleted',
            description: `Document deleted: ${document.name}`,
            entity_type: 'document',
            entity_id: id
          }]);
      }

      return res.json({
        success: true,
        message: 'Document deleted successfully'
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Documents API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
};
