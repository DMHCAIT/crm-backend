// Enhanced Documents API with Verification Workflows
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

// Initialize Supabase conditionally
let supabase;
try {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
  }
} catch (error) {
  console.log('Documents module: Supabase initialization failed:', error.message);
}

const JWT_SECRET = process.env.JWT_SECRET || 'dmhca-crm-super-secure-jwt-secret-2025';

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow common document formats
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png', 
      'image/jpg',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, images, and documents allowed.'));
    }
  }
});

// Verify user authentication
function verifyToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No valid token provided');
  }
  
  const token = authHeader.substring(7);
  return jwt.verify(token, JWT_SECRET);
}

module.exports = async (req, res) => {
    // Set CORS headers
  const allowedOrigins = [
    'https://www.crmdmhca.com', 
    'https://crmdmhca.com', 
    'https://crm-frontend-dmhca.vercel.app',
    'https://dmhca-crm-frontend.vercel.app',
    'http://localhost:5173'
  ];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin) || (origin && origin.match(/^https:\/\/[\w-]+\.vercel\.app$/))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (!supabase) {
    return res.status(500).json({
      success: false,
      error: 'Database connection not available'
    });
  }

  try {
    // Parse URL to determine action
    const urlParts = req.url.split('/').filter(part => part);
    const action = urlParts[urlParts.length - 1];
    const id = urlParts[urlParts.length - 1];

    switch (req.method) {
      case 'GET':
        if (action === 'student' && urlParts.length > 1) {
          const studentId = urlParts[urlParts.length - 1];
          await handleGetDocumentsByStudent(req, res, studentId);
        } else if (action === 'lead' && urlParts.length > 1) {
          const leadId = urlParts[urlParts.length - 1];
          await handleGetDocumentsByLead(req, res, leadId);
        } else if (action === 'download') {
          const docId = urlParts[urlParts.length - 2];
          await handleDownloadDocument(req, res, docId);
        } else {
          await handleGetDocuments(req, res);
        }
        break;
      
      case 'POST':
        if (action === 'upload') {
          await handleUploadDocument(req, res);
        } else if (action === 'verify') {
          const docId = urlParts[urlParts.length - 2];
          await handleVerifyDocument(req, res, docId);
        } else {
          await handleCreateDocument(req, res);
        }
        break;
      
      case 'PUT':
        await handleUpdateDocument(req, res, id);
        break;
      
      case 'DELETE':
        await handleDeleteDocument(req, res, id);
        break;
      
      default:
        res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Documents API error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
};

// Get documents with filtering
async function handleGetDocuments(req, res) {
  try {
    const user = verifyToken(req);
    const { 
      status,
      student_id,
      lead_id,
      document_type,
      is_required,
      is_confidential,
      access_level,
      limit = 50,
      offset = 0 
    } = req.query;

    let query = supabase
      .from('documents')
      .select(`
        *,
        student:student_id(name, email, phone),
        lead:lead_id(fullName, email, phone),
        uploaded_by:uploaded_by_id(name, email),
        verified_by:verified_by_id(name, email)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    // Apply filters
    if (status) query = query.eq('status', status);
    if (student_id) query = query.eq('student_id', student_id);
    if (lead_id) query = query.eq('lead_id', lead_id);
    if (document_type) query = query.eq('document_type', document_type);
    if (is_required !== undefined) query = query.eq('is_required', is_required === 'true');
    if (is_confidential !== undefined) query = query.eq('is_confidential', is_confidential === 'true');
    if (access_level) query = query.eq('access_level', access_level);

    const { data: documents, error } = await query;

    if (error) throw error;

    // Filter confidential documents based on user access
    const filteredDocuments = documents?.filter(doc => {
      if (!doc.is_confidential) return true;
      // Add access control logic based on user role/permissions
      return user.role === 'admin' || doc.uploaded_by_id === user.id;
    }) || [];

    res.json({
      success: true,
      documents: filteredDocuments,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: filteredDocuments.length === parseInt(limit)
      }
    });
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

// Upload new document
async function handleUploadDocument(req, res) {
  upload.single('file')(req, res, async (uploadError) => {
    if (uploadError) {
      return res.status(400).json({
        success: false,
        error: 'File upload error',
        details: uploadError.message
      });
    }

    try {
      const user = verifyToken(req);
      const {
        document_name,
        document_type,
        student_id,
        lead_id,
        is_required = false,
        is_confidential = false,
        access_level = 'standard',
        notes
      } = req.body;

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No file uploaded'
        });
      }

      if (!document_name || !document_type) {
        return res.status(400).json({
          success: false,
          error: 'Document name and type are required'
        });
      }

      if (!student_id && !lead_id) {
        return res.status(400).json({
          success: false,
          error: 'Either student_id or lead_id is required'
        });
      }

      // Generate unique filename
      const fileExtension = path.extname(req.file.originalname);
      const fileName = `${uuidv4()}${fileExtension}`;
      const filePath = `documents/${student_id || lead_id}/${fileName}`;

      // Upload file to Supabase Storage
      const { data: uploadData, error: uploadStorageError } = await supabase.storage
        .from('documents')
        .upload(filePath, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: false
        });

      if (uploadStorageError) {
        throw new Error(`File upload failed: ${uploadStorageError.message}`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      // Create document record in database
      const { data: document, error: dbError } = await supabase
        .from('documents')
        .insert([{
          document_name,
          document_type,
          student_id: student_id || null,
          lead_id: lead_id || null,
          file_path: filePath,
          file_url: urlData.publicUrl,
          file_size: req.file.size,
          mime_type: req.file.mimetype,
          original_filename: req.file.originalname,
          uploaded_by_id: user.id,
          status: 'pending',
          is_required: is_required === 'true' || is_required === true,
          is_confidential: is_confidential === 'true' || is_confidential === true,
          access_level,
          notes,
          created_at: new Date().toISOString()
        }])
        .select(`
          *,
          student:student_id(name, email),
          lead:lead_id(fullName, email),
          uploaded_by:uploaded_by_id(name, email)
        `)
        .single();

      if (dbError) {
        // Clean up uploaded file if database insert fails
        await supabase.storage.from('documents').remove([filePath]);
        throw dbError;
      }

      // Log document upload activity
      await logDocumentActivity(document.id, 'upload', `Document uploaded: ${document_name}`, user.id);

      res.json({
        success: true,
        message: 'Document uploaded successfully',
        document
      });
    } catch (error) {
      console.error('Document upload error:', error);
      res.status(500).json({
        success: false,
        error: 'Document upload failed',
        details: error.message
      });
    }
  });
}

// Verify or reject document
async function handleVerifyDocument(req, res) {
  try {
    const user = verifyToken(req);
    const documentId = req.params?.id || req.url.split('/').slice(-2)[0];
    const {
      status,
      verification_notes
    } = req.body;

    if (!['verified', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Status must be either "verified" or "rejected"'
      });
    }

    // Check if document exists
    const { data: existingDoc, error: fetchError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (fetchError || !existingDoc) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      });
    }

    // Update document verification status
    const { data: document, error: updateError } = await supabase
      .from('documents')
      .update({
        status,
        verification_notes,
        verified_by_id: user.id,
        verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId)
      .select(`
        *,
        student:student_id(name, email),
        lead:lead_id(fullName, email),
        verified_by:verified_by_id(name, email)
      `)
      .single();

    if (updateError) throw updateError;

    // Log verification activity
    const action = status === 'verified' ? 'verify' : 'reject';
    const message = `Document ${status}: ${verification_notes || 'No notes provided'}`;
    await logDocumentActivity(documentId, action, message, user.id);

    res.json({
      success: true,
      message: `Document ${status} successfully`,
      document
    });
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

// Get documents by student
async function handleGetDocumentsByStudent(req, res, studentId) {
  try {
    const user = verifyToken(req);

    const { data: documents, error } = await supabase
      .from('documents')
      .select(`
        *,
        uploaded_by:uploaded_by_id(name, email),
        verified_by:verified_by_id(name, email)
      `)
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Filter confidential documents based on access control
    const filteredDocuments = documents?.filter(doc => {
      if (!doc.is_confidential) return true;
      return user.role === 'admin' || doc.uploaded_by_id === user.id;
    }) || [];

    res.json({
      success: true,
      documents: filteredDocuments,
      student_id: studentId
    });
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

// Get documents by lead
async function handleGetDocumentsByLead(req, res, leadId) {
  try {
    const user = verifyToken(req);

    const { data: documents, error } = await supabase
      .from('documents')
      .select(`
        *,
        uploaded_by:uploaded_by_id(name, email),
        verified_by:verified_by_id(name, email)
      `)
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Filter confidential documents based on access control
    const filteredDocuments = documents?.filter(doc => {
      if (!doc.is_confidential) return true;
      return user.role === 'admin' || doc.uploaded_by_id === user.id;
    }) || [];

    res.json({
      success: true,
      documents: filteredDocuments,
      lead_id: leadId
    });
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

// Update document metadata
async function handleUpdateDocument(req, res, documentId) {
  try {
    const user = verifyToken(req);
    const {
      document_name,
      document_type,
      notes,
      is_required,
      is_confidential,
      access_level
    } = req.body;

    // Check if document exists and user has permission
    const { data: existingDoc, error: fetchError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (fetchError || !existingDoc) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      });
    }

    // Only admin or document uploader can update
    if (user.role !== 'admin' && existingDoc.uploaded_by_id !== user.id) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    const updateData = {
      updated_at: new Date().toISOString()
    };

    if (document_name) updateData.document_name = document_name;
    if (document_type) updateData.document_type = document_type;
    if (notes) updateData.notes = notes;
    if (is_required !== undefined) updateData.is_required = is_required;
    if (is_confidential !== undefined) updateData.is_confidential = is_confidential;
    if (access_level) updateData.access_level = access_level;

    const { data: document, error: updateError } = await supabase
      .from('documents')
      .update(updateData)
      .eq('id', documentId)
      .select(`
        *,
        student:student_id(name, email),
        lead:lead_id(fullName, email),
        uploaded_by:uploaded_by_id(name, email),
        verified_by:verified_by_id(name, email)
      `)
      .single();

    if (updateError) throw updateError;

    // Log update activity
    await logDocumentActivity(documentId, 'update', 'Document metadata updated', user.id);

    res.json({
      success: true,
      message: 'Document updated successfully',
      document
    });
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

// Delete document
async function handleDeleteDocument(req, res, documentId) {
  try {
    const user = verifyToken(req);

    // Check if document exists and user has permission
    const { data: existingDoc, error: fetchError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (fetchError || !existingDoc) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      });
    }

    // Only admin or document uploader can delete
    if (user.role !== 'admin' && existingDoc.uploaded_by_id !== user.id) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    // Delete file from storage
    if (existingDoc.file_path) {
      await supabase.storage
        .from('documents')
        .remove([existingDoc.file_path]);
    }

    // Delete document record
    const { error: deleteError } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId);

    if (deleteError) throw deleteError;

    // Log deletion activity
    await logDocumentActivity(documentId, 'delete', `Document deleted: ${existingDoc.document_name}`, user.id);

    res.json({
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

// Download document
async function handleDownloadDocument(req, res, documentId) {
  try {
    const user = verifyToken(req);

    // Check document exists and access permissions
    const { data: document, error: fetchError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (fetchError || !document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      });
    }

    // Check access permissions for confidential documents
    if (document.is_confidential && user.role !== 'admin' && document.uploaded_by_id !== user.id) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    // Get signed URL for download
    const { data: signedUrl, error: urlError } = await supabase.storage
      .from('documents')
      .createSignedUrl(document.file_path, 3600); // 1 hour expiry

    if (urlError) {
      throw new Error('Failed to generate download URL');
    }

    // Log download activity
    await logDocumentActivity(documentId, 'download', 'Document downloaded', user.id);

    res.json({
      success: true,
      download_url: signedUrl.signedUrl,
      expires_at: new Date(Date.now() + 3600 * 1000).toISOString()
    });
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

// Helper function to log document activities
async function logDocumentActivity(documentId, action, description, userId) {
  try {
    await supabase
      .from('document_activities')
      .insert([{
        document_id: documentId,
        action,
        description,
        user_id: userId,
        timestamp: new Date().toISOString()
      }]);
  } catch (error) {
    console.error('Failed to log document activity:', error);
  }
}

// Helper function to get document statistics
async function getDocumentStats(studentId = null, leadId = null) {
  try {
    let query = supabase.from('documents').select('status, document_type');
    
    if (studentId) query = query.eq('student_id', studentId);
    if (leadId) query = query.eq('lead_id', leadId);

    const { data: documents, error } = await query;

    if (error) throw error;

    const stats = {
      total: documents?.length || 0,
      pending: 0,
      verified: 0,
      rejected: 0,
      byType: {}
    };

    documents?.forEach(doc => {
      stats[doc.status]++;
      stats.byType[doc.document_type] = (stats.byType[doc.document_type] || 0) + 1;
    });

    return stats;
  } catch (error) {
    console.error('Error getting document stats:', error);
    return null;
  }
}