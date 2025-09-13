// Enhanced Data Export API with CSV/Excel Export Functionality
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const fs = require('fs').promises;
const path = require('path');

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
  console.log('Data Export module: Supabase initialization failed:', error.message);
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

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

    switch (req.method) {
      case 'GET':
        if (action.includes('status')) {
          await handleGetExportStatus(req, res);
        } else if (action.includes('download')) {
          await handleDownloadExport(req, res);
        } else {
          await handleGetExports(req, res);
        }
        break;
      
      case 'POST':
        if (action === 'leads') {
          await handleExportLeads(req, res);
        } else if (action === 'students') {
          await handleExportStudents(req, res);
        } else if (action === 'payments') {
          await handleExportPayments(req, res);
        } else if (action === 'communications') {
          await handleExportCommunications(req, res);
        } else if (action === 'analytics') {
          await handleExportAnalytics(req, res);
        } else {
          await handleCreateExport(req, res);
        }
        break;
      
      case 'DELETE':
        await handleDeleteExport(req, res);
        break;
      
      default:
        res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Data Export API error:', error);
    
    if (error.message === 'No valid token provided' || error.name === 'JsonWebTokenError') {
      res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  }
};

// Get export jobs list
async function handleGetExports(req, res) {
  try {
    const user = verifyToken(req);
    const { status, type, limit = 50 } = req.query;

    let query = supabase
      .from('data_exports')
      .select('*')
      .eq('created_by_id', user.id)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (status) query = query.eq('status', status);
    if (type) query = query.eq('export_type', type);

    const { data: exports, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      exports: exports || [],
      total_count: exports?.length || 0
    });
  } catch (error) {
    throw error;
  }
}

// Get export job status
async function handleGetExportStatus(req, res) {
  try {
    const user = verifyToken(req);
    const { jobId } = req.query;

    if (!jobId) {
      return res.status(400).json({
        success: false,
        error: 'Job ID is required'
      });
    }

    const { data: exportJob, error } = await supabase
      .from('data_exports')
      .select('*')
      .eq('id', jobId)
      .eq('created_by_id', user.id)
      .single();

    if (error || !exportJob) {
      return res.status(404).json({
        success: false,
        error: 'Export job not found'
      });
    }

    res.json({
      success: true,
      export_job: exportJob
    });
  } catch (error) {
    throw error;
  }
}

// Export leads data
async function handleExportLeads(req, res) {
  try {
    const user = verifyToken(req);
    const {
      format = 'csv',
      date_range = '30d',
      status,
      source,
      assigned_to,
      include_communications = false
    } = req.body;

    // Create export job
    const exportJob = await createExportJob(user.id, 'leads', format, {
      date_range,
      status,
      source,
      assigned_to,
      include_communications
    });

    // Start async export process
    processLeadsExport(exportJob.id, user.id, {
      format,
      date_range,
      status,
      source,
      assigned_to,
      include_communications: include_communications === true || include_communications === 'true'
    }).catch(error => {
      console.error('Leads export process error:', error);
      updateExportJobStatus(exportJob.id, 'failed', { error: error.message });
    });

    res.json({
      success: true,
      message: 'Leads export started',
      job_id: exportJob.id,
      estimated_time: '2-5 minutes'
    });
  } catch (error) {
    throw error;
  }
}

// Export students data
async function handleExportStudents(req, res) {
  try {
    const user = verifyToken(req);
    const {
      format = 'csv',
      date_range = '30d',
      status,
      course,
      include_payments = false,
      include_documents = false
    } = req.body;

    // Create export job
    const exportJob = await createExportJob(user.id, 'students', format, {
      date_range,
      status,
      course,
      include_payments,
      include_documents
    });

    // Start async export process
    processStudentsExport(exportJob.id, user.id, {
      format,
      date_range,
      status,
      course,
      include_payments: include_payments === true || include_payments === 'true',
      include_documents: include_documents === true || include_documents === 'true'
    }).catch(error => {
      console.error('Students export process error:', error);
      updateExportJobStatus(exportJob.id, 'failed', { error: error.message });
    });

    res.json({
      success: true,
      message: 'Students export started',
      job_id: exportJob.id,
      estimated_time: '2-5 minutes'
    });
  } catch (error) {
    throw error;
  }
}

// Export payments data
async function handleExportPayments(req, res) {
  try {
    const user = verifyToken(req);
    const {
      format = 'csv',
      date_range = '30d',
      status,
      payment_method,
      include_refunds = false
    } = req.body;

    // Create export job
    const exportJob = await createExportJob(user.id, 'payments', format, {
      date_range,
      status,
      payment_method,
      include_refunds
    });

    // Start async export process
    processPaymentsExport(exportJob.id, user.id, {
      format,
      date_range,
      status,
      payment_method,
      include_refunds: include_refunds === true || include_refunds === 'true'
    }).catch(error => {
      console.error('Payments export process error:', error);
      updateExportJobStatus(exportJob.id, 'failed', { error: error.message });
    });

    res.json({
      success: true,
      message: 'Payments export started',
      job_id: exportJob.id,
      estimated_time: '2-5 minutes'
    });
  } catch (error) {
    throw error;
  }
}

// Download export file
async function handleDownloadExport(req, res) {
  try {
    const user = verifyToken(req);
    const { jobId } = req.query;

    if (!jobId) {
      return res.status(400).json({
        success: false,
        error: 'Job ID is required'
      });
    }

    const { data: exportJob, error } = await supabase
      .from('data_exports')
      .select('*')
      .eq('id', jobId)
      .eq('created_by_id', user.id)
      .single();

    if (error || !exportJob) {
      return res.status(404).json({
        success: false,
        error: 'Export job not found'
      });
    }

    if (exportJob.status !== 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Export is not ready for download',
        status: exportJob.status
      });
    }

    if (!exportJob.file_url) {
      return res.status(400).json({
        success: false,
        error: 'Export file not available'
      });
    }

    // Update download count
    await supabase
      .from('data_exports')
      .update({
        download_count: (exportJob.download_count || 0) + 1,
        last_downloaded_at: new Date().toISOString()
      })
      .eq('id', jobId);

    res.json({
      success: true,
      download_url: exportJob.file_url,
      filename: exportJob.filename,
      file_size: exportJob.file_size,
      export_type: exportJob.export_type,
      format: exportJob.format
    });
  } catch (error) {
    throw error;
  }
}

// Helper functions
async function createExportJob(userId, exportType, format, filters) {
  const { data: job, error } = await supabase
    .from('data_exports')
    .insert([{
      export_type: exportType,
      format: format,
      status: 'pending',
      filters: filters,
      created_by_id: userId,
      created_at: new Date().toISOString()
    }])
    .select()
    .single();

  if (error) throw error;
  return job;
}

async function updateExportJobStatus(jobId, status, updates = {}) {
  const updateData = {
    status,
    updated_at: new Date().toISOString(),
    ...updates
  };

  if (status === 'completed') {
    updateData.completed_at = new Date().toISOString();
  } else if (status === 'failed') {
    updateData.failed_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('data_exports')
    .update(updateData)
    .eq('id', jobId);

  if (error) console.error('Failed to update export job status:', error);
}

async function processLeadsExport(jobId, userId, options) {
  try {
    // Update status to processing
    await updateExportJobStatus(jobId, 'processing');

    // Build query
    let query = supabase
      .from('leads')
      .select(`
        *,
        users!leads_assigned_to_fkey(full_name, email)
      `);

    // Apply filters
    if (options.status) query = query.eq('status', options.status);
    if (options.source) query = query.eq('source', options.source);
    if (options.assigned_to) query = query.eq('assigned_to', options.assigned_to);

    // Date range filter
    if (options.date_range) {
      const daysBack = parseInt(options.date_range.replace('d', ''));
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);
      query = query.gte('created_at', startDate.toISOString());
    }

    const { data: leads, error } = await query;
    if (error) throw error;

    // Include communications if requested
    let communicationsData = {};
    if (options.include_communications) {
      const leadIds = leads.map(l => l.id);
      const { data: communications } = await supabase
        .from('communications')
        .select('*')
        .in('lead_id', leadIds);

      communicationsData = (communications || []).reduce((acc, comm) => {
        if (!acc[comm.lead_id]) acc[comm.lead_id] = [];
        acc[comm.lead_id].push(comm);
        return acc;
      }, {});
    }

    // Generate file content
    const fileContent = generateExportContent(leads, options.format, 'leads', {
      communications: communicationsData,
      include_communications: options.include_communications
    });

    // Save file and get URL (mock implementation - integrate with your file storage)
    const filename = `leads_export_${new Date().toISOString().split('T')[0]}.${options.format}`;
    const fileUrl = await saveExportFile(filename, fileContent);
    const fileSize = Buffer.byteLength(fileContent, 'utf8');

    // Update job as completed
    await updateExportJobStatus(jobId, 'completed', {
      filename,
      file_url: fileUrl,
      file_size: fileSize,
      record_count: leads.length
    });

  } catch (error) {
    await updateExportJobStatus(jobId, 'failed', { error_message: error.message });
    throw error;
  }
}

async function processStudentsExport(jobId, userId, options) {
  try {
    await updateExportJobStatus(jobId, 'processing');

    let query = supabase
      .from('students')
      .select(`
        *,
        users!students_counselor_id_fkey(full_name, email)
      `);

    // Apply filters
    if (options.status) query = query.eq('status', options.status);
    if (options.course) query = query.eq('course', options.course);

    if (options.date_range) {
      const daysBack = parseInt(options.date_range.replace('d', ''));
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);
      query = query.gte('created_at', startDate.toISOString());
    }

    const { data: students, error } = await query;
    if (error) throw error;

    // Include additional data if requested
    let paymentsData = {};
    let documentsData = {};

    if (options.include_payments) {
      const studentIds = students.map(s => s.id);
      const { data: payments } = await supabase
        .from('payments')
        .select('*')
        .in('student_id', studentIds);

      paymentsData = (payments || []).reduce((acc, payment) => {
        if (!acc[payment.student_id]) acc[payment.student_id] = [];
        acc[payment.student_id].push(payment);
        return acc;
      }, {});
    }

    if (options.include_documents) {
      const studentIds = students.map(s => s.id);
      const { data: documents } = await supabase
        .from('documents')
        .select('*')
        .in('student_id', studentIds);

      documentsData = (documents || []).reduce((acc, doc) => {
        if (!acc[doc.student_id]) acc[doc.student_id] = [];
        acc[doc.student_id].push(doc);
        return acc;
      }, {});
    }

    const fileContent = generateExportContent(students, options.format, 'students', {
      payments: paymentsData,
      documents: documentsData,
      include_payments: options.include_payments,
      include_documents: options.include_documents
    });

    const filename = `students_export_${new Date().toISOString().split('T')[0]}.${options.format}`;
    const fileUrl = await saveExportFile(filename, fileContent);
    const fileSize = Buffer.byteLength(fileContent, 'utf8');

    await updateExportJobStatus(jobId, 'completed', {
      filename,
      file_url: fileUrl,
      file_size: fileSize,
      record_count: students.length
    });

  } catch (error) {
    await updateExportJobStatus(jobId, 'failed', { error_message: error.message });
    throw error;
  }
}

async function processPaymentsExport(jobId, userId, options) {
  try {
    await updateExportJobStatus(jobId, 'processing');

    let query = supabase
      .from('payments')
      .select(`
        *,
        students!payments_student_id_fkey(full_name, email, phone)
      `);

    // Apply filters
    if (options.status) query = query.eq('status', options.status);
    if (options.payment_method) query = query.eq('payment_method', options.payment_method);

    if (options.date_range) {
      const daysBack = parseInt(options.date_range.replace('d', ''));
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);
      query = query.gte('created_at', startDate.toISOString());
    }

    const { data: payments, error } = await query;
    if (error) throw error;

    const fileContent = generateExportContent(payments, options.format, 'payments', {
      include_refunds: options.include_refunds
    });

    const filename = `payments_export_${new Date().toISOString().split('T')[0]}.${options.format}`;
    const fileUrl = await saveExportFile(filename, fileContent);
    const fileSize = Buffer.byteLength(fileContent, 'utf8');

    await updateExportJobStatus(jobId, 'completed', {
      filename,
      file_url: fileUrl,
      file_size: fileSize,
      record_count: payments.length
    });

  } catch (error) {
    await updateExportJobStatus(jobId, 'failed', { error_message: error.message });
    throw error;
  }
}

function generateExportContent(data, format, type, options = {}) {
  if (format === 'csv') {
    return generateCSVContent(data, type, options);
  } else if (format === 'excel' || format === 'xlsx') {
    // For Excel, we'll generate CSV for now (can be enhanced with actual Excel library)
    return generateCSVContent(data, type, options);
  } else {
    return JSON.stringify(data, null, 2);
  }
}

function generateCSVContent(data, type, options = {}) {
  if (!data || data.length === 0) {
    return 'No data available for export';
  }

  const headers = getExportHeaders(type, options);
  const rows = data.map(item => formatExportRow(item, type, options));

  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
}

function getExportHeaders(type, options = {}) {
  const baseHeaders = {
    leads: ['ID', 'Name', 'Email', 'Phone', 'Status', 'Source', 'Assigned To', 'Created Date'],
    students: ['ID', 'Name', 'Email', 'Phone', 'Status', 'Course', 'Counselor', 'Enrollment Date'],
    payments: ['ID', 'Student Name', 'Amount', 'Status', 'Method', 'Transaction ID', 'Date']
  };

  let headers = baseHeaders[type] || [];

  // Add conditional headers
  if (options.include_communications && type === 'leads') {
    headers.push('Last Communication', 'Communication Count');
  }
  if (options.include_payments && type === 'students') {
    headers.push('Total Payments', 'Outstanding Amount');
  }
  if (options.include_documents && type === 'students') {
    headers.push('Documents Submitted', 'Verified Documents');
  }

  return headers;
}

function formatExportRow(item, type, options = {}) {
  const baseRow = {
    leads: [
      item.id,
      `"${item.full_name || ''}"`,
      item.email || '',
      item.phone || '',
      item.status || '',
      item.source || '',
      `"${item.users?.full_name || ''}"`,
      item.created_at ? new Date(item.created_at).toLocaleDateString() : ''
    ],
    students: [
      item.id,
      `"${item.full_name || ''}"`,
      item.email || '',
      item.phone || '',
      item.status || '',
      item.course || '',
      `"${item.users?.full_name || ''}"`,
      item.enrollment_date ? new Date(item.enrollment_date).toLocaleDateString() : ''
    ],
    payments: [
      item.id,
      `"${item.students?.full_name || ''}"`,
      item.amount || 0,
      item.status || '',
      item.payment_method || '',
      item.transaction_id || '',
      item.created_at ? new Date(item.created_at).toLocaleDateString() : ''
    ]
  };

  let row = baseRow[type] || [];

  // Add conditional data
  if (options.include_communications && type === 'leads') {
    const comms = options.communications[item.id] || [];
    const lastComm = comms.length > 0 ? new Date(comms[0].created_at).toLocaleDateString() : 'None';
    row.push(lastComm, comms.length);
  }

  return row;
}

async function saveExportFile(filename, content) {
  // Mock implementation - replace with actual file storage (AWS S3, etc.)
  // For now, return a mock URL
  return `https://your-storage.com/exports/${filename}`;
}

// Delete export job
async function handleDeleteExport(req, res) {
  try {
    const user = verifyToken(req);
    const { jobId } = req.query;

    if (!jobId) {
      return res.status(400).json({
        success: false,
        error: 'Job ID is required'
      });
    }

    const { error } = await supabase
      .from('data_exports')
      .delete()
      .eq('id', jobId)
      .eq('created_by_id', user.id);

    if (error) throw error;

    res.json({
      success: true,
      message: 'Export job deleted successfully'
    });
  } catch (error) {
    throw error;
  }
}