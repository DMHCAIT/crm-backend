const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
let supabase;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials for document management');
} else {
  supabase = createClient(supabaseUrl, supabaseKey);
}

// JWT verification
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'No authorization header' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
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
      cb(new Error('Invalid file type. Only PDF, DOC, DOCX, images, and TXT files are allowed.'));
    }
  }
});

// POST upload document
router.post('/upload', verifyToken, upload.single('file'), async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const { entityType, entityId } = req.body;

    if (!entityType || !entityId) {
      return res.status(400).json({ error: 'entityType and entityId are required' });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileExt = path.extname(req.file.originalname);
    const fileName = `${entityType}_${entityId}_${timestamp}${fileExt}`;
    const filePath = `documents/${entityType}s/${entityId}/${fileName}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('crm-documents')
      .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Supabase storage upload error:', uploadError);
      throw uploadError;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('crm-documents')
      .getPublicUrl(filePath);

    // Save document metadata to database
    const { data: docData, error: docError } = await supabase
      .from('documents')
      .insert({
        entity_type: entityType,
        entity_id: entityId,
        name: req.file.originalname,
        file_name: fileName,
        file_path: filePath,
        file_size: req.file.size,
        file_type: req.file.mimetype,
        url: urlData.publicUrl,
        uploaded_by: req.user.id,
        uploaded_at: new Date().toISOString()
      })
      .select()
      .single();

    if (docError) {
      // Rollback storage upload if database insert fails
      await supabase.storage.from('crm-documents').remove([filePath]);
      throw docError;
    }

    res.json({
      message: 'Document uploaded successfully',
      document: {
        id: docData.id,
        name: docData.name,
        size: docData.file_size,
        type: docData.file_type,
        url: docData.url,
        uploadedAt: docData.uploaded_at,
        uploadedBy: req.user.email
      }
    });

  } catch (error) {
    console.error('Upload document error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to upload document'
    });
  }
});

// GET documents for entity
router.get('/:entityType/:entityId', verifyToken, async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    const { entityType, entityId } = req.params;

    const { data, error } = await supabase
      .from('documents')
      .select(`
        *,
        uploader:uploaded_by (
          email,
          full_name
        )
      `)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('uploaded_at', { ascending: false });

    if (error) throw error;

    const documents = data.map(doc => ({
      id: doc.id,
      name: doc.name,
      size: doc.file_size,
      type: doc.file_type,
      url: doc.url,
      uploadedAt: doc.uploaded_at,
      uploadedBy: doc.uploader?.email || 'Unknown'
    }));

    res.json({ documents });

  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE document
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    const { id } = req.params;

    // Get document details
    const { data: doc, error: fetchError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    // Check permission (user must be uploader or admin)
    if (doc.uploaded_by !== req.user.id && req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Permission denied' });
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('crm-documents')
      .remove([doc.file_path]);

    if (storageError) {
      console.error('Storage delete error:', storageError);
      // Continue with database deletion even if storage fails
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('documents')
      .delete()
      .eq('id', id);

    if (dbError) throw dbError;

    res.json({ message: 'Document deleted successfully' });

  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET document by ID
router.get('/file/:id', verifyToken, async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    const { id } = req.params;

    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    res.json({
      document: {
        id: data.id,
        name: data.name,
        size: data.file_size,
        type: data.file_type,
        url: data.url,
        uploadedAt: data.uploaded_at
      }
    });

  } catch (error) {
    console.error('Get document error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST bulk upload
router.post('/bulk-upload', verifyToken, upload.array('files', 10), async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }

    const { entityType, entityId } = req.body;

    if (!entityType || !entityId) {
      return res.status(400).json({ error: 'entityType and entityId are required' });
    }

    const uploadedDocuments = [];
    const errors = [];

    for (const file of req.files) {
      try {
        const timestamp = Date.now();
        const fileExt = path.extname(file.originalname);
        const fileName = `${entityType}_${entityId}_${timestamp}${fileExt}`;
        const filePath = `documents/${entityType}s/${entityId}/${fileName}`;

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('crm-documents')
          .upload(filePath, file.buffer, {
            contentType: file.mimetype,
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('crm-documents')
          .getPublicUrl(filePath);

        // Save metadata
        const { data: docData, error: docError } = await supabase
          .from('documents')
          .insert({
            entity_type: entityType,
            entity_id: entityId,
            name: file.originalname,
            file_name: fileName,
            file_path: filePath,
            file_size: file.size,
            file_type: file.mimetype,
            url: urlData.publicUrl,
            uploaded_by: req.user.id,
            uploaded_at: new Date().toISOString()
          })
          .select()
          .single();

        if (docError) throw docError;

        uploadedDocuments.push({
          id: docData.id,
          name: docData.name,
          size: docData.file_size,
          type: docData.file_type,
          url: docData.url
        });

      } catch (error) {
        errors.push({
          fileName: file.originalname,
          error: error.message
        });
      }
    }

    res.json({
      message: `Uploaded ${uploadedDocuments.length} of ${req.files.length} files`,
      documents: uploadedDocuments,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Bulk upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
