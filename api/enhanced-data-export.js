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

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

// Verify user authentication
function verifyToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No valid token provided');
  }
  
  const token = authHeader.substring(7);
  return jwt.verify(token, JWT_SECRET);
}

// Helper function to format notes for export - FIXED VERSION
const formatNotes = (item, options) => {
  // Debug specific lead
  const isDebugLead = item.id === '2d4b57f0-41eb-46f1-b7a2-d2267f71b009';
  if (isDebugLead) {
    console.log('🔍 DEBUG: Processing Dr Arooja Wani lead notes');
    console.log('🔍 DEBUG: Notes value:', item.notes);
    console.log('🔍 DEBUG: Notes type:', typeof item.notes);
  }
  
  let notesToFormat = [];
  
  // Parse notes from leads.notes column (JSON string)
  if (item.notes && typeof item.notes === 'string' && item.notes.trim()) {
    try {
      notesToFormat = JSON.parse(item.notes);
      if (isDebugLead) {
        console.log('📝 DEBUG: Successfully parsed', notesToFormat.length, 'notes');
      }
    } catch (error) {
      if (isDebugLead) {
        console.log('📝 DEBUG: Error parsing notes:', error.message);
      }
      return '';
    }
  } else if (Array.isArray(item.notes)) {
    notesToFormat = item.notes;
  }
  
  if (!notesToFormat || notesToFormat.length === 0) {
    return '';
  }
  
  try {
    // Format each note: [date] Author: content
    const formattedNotes = notesToFormat.map(note => {
      const date = new Date(note.timestamp).toLocaleDateString();
      return `[${date}] ${note.author}: ${note.content}`;
    }).join(' | ');
    
    // Escape quotes for CSV
    return `"${formattedNotes.replace(/"/g, '""')}"`;
  } catch (error) {
    if (isDebugLead) {
      console.log('📝 DEBUG: Error formatting notes:', error.message);
    }
    return '';
  }
};

// Get subordinate usernames for hierarchical access
async function getSubordinateUsernames(currentUser) {
  if (!currentUser) return [];
  
  try {
    let usernames = [currentUser.username];
    
    // Add role-based hierarchy
    if (currentUser.role === 'admin' || currentUser.role === 'super_admin') {
      const { data: allUsers } = await supabase
        .from('users')
        .select('username')
        .neq('role', 'super_admin');
      
      if (allUsers) {
        usernames = usernames.concat(allUsers.map(u => u.username));
      }
    } else if (currentUser.role === 'manager') {
      const { data: subordinates } = await supabase
        .from('users')
        .select('username')
        .in('role', ['employee', 'intern']);
      
      if (subordinates) {
        usernames = usernames.concat(subordinates.map(u => u.username));
      }
    }
    
    return [...new Set(usernames)]; // Remove duplicates
  } catch (error) {
    console.error('Error getting subordinate usernames:', error);
    return [currentUser.username];
  }
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
        } else {
          await handleDataExport(req, res);
        }
        break;
      case 'POST':
        await handleDataExport(req, res);
        break;
      default:
        res.status(405).json({ success: false, error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Enhanced Data Export API Error:', error);
    res.status(error.message.includes('token') ? 401 : 500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
};

// Handle data export request
async function handleDataExport(req, res) {
  try {
    const user = verifyToken(req);
    if (!user || !user.username) {
      throw new Error('Invalid token or missing username');
    }

    const { 
      dataType = 'leads', 
      format = 'csv',
      filters = {},
      columns = null,
      dateRange = null
    } = req.method === 'GET' ? req.query : req.body;

    console.log(`📊 Export request from ${user.username}: ${dataType} as ${format}`);

    // Get accessible usernames for hierarchical filtering
    const accessibleUsernames = await getSubordinateUsernames(user);
    console.log(`👥 User ${user.username} can access data for:`, accessibleUsernames);

    let data;
    let filename;

    switch (dataType) {
      case 'leads':
        data = await exportLeads(accessibleUsernames, filters, dateRange, columns);
        filename = `leads_export_${new Date().toISOString().split('T')[0]}.${format}`;
        break;
      case 'students':
        data = await exportStudents(accessibleUsernames, filters, dateRange, columns);
        filename = `students_export_${new Date().toISOString().split('T')[0]}.${format}`;
        break;
      case 'payments':
        data = await exportPayments(accessibleUsernames, filters, dateRange, columns);
        filename = `payments_export_${new Date().toISOString().split('T')[0]}.${format}`;
        break;
      default:
        throw new Error('Invalid data type');
    }

    if (!data || data.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No data found for export'
      });
    }

    console.log(`📈 Exporting ${data.length} ${dataType} records`);

    // Generate export file
    let exportData;
    let contentType;

    if (format === 'csv') {
      exportData = generateCSV(data);
      contentType = 'text/csv';
    } else if (format === 'excel' || format === 'xlsx') {
      exportData = generateExcel(data);
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    } else {
      throw new Error('Unsupported export format');
    }

    // Set response headers for file download
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', Buffer.byteLength(exportData));

    res.status(200).send(exportData);

  } catch (error) {
    console.error('Export error:', error);
    res.status(error.message.includes('token') ? 401 : 500).json({
      success: false,
      error: error.message || 'Export failed'
    });
  }
}

// Export leads data with proper notes handling
async function exportLeads(accessibleUsernames, filters = {}, dateRange = null, columns = null) {
  try {
    console.log('🔍 Starting leads export with notes...');
    
    // Build query with explicit notes field selection
    let query = supabase
      .from('leads')
      .select(`
        id,
        fullName,
        email,
        phone,
        course,
        branch,
        status,
        priority,
        source,
        assigned_to,
        assigned_by,
        notes,
        created_at,
        updated_at
      `);

    // Apply username-based filtering
    if (accessibleUsernames && accessibleUsernames.length > 0) {
      query = query.or(`assigned_to.in.(${accessibleUsernames.join(',')}),assigned_by.in.(${accessibleUsernames.join(',')})`);
    }

    // Apply additional filters
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.branch) {
      query = query.eq('branch', filters.branch);
    }
    if (filters.course) {
      query = query.eq('course', filters.course);
    }
    if (filters.priority) {
      query = query.eq('priority', filters.priority);
    }

    // Apply date range
    if (dateRange) {
      if (dateRange.start) {
        query = query.gte('created_at', dateRange.start);
      }
      if (dateRange.end) {
        query = query.lte('created_at', dateRange.end);
      }
    }

    // Order by creation date
    query = query.order('created_at', { ascending: false });

    const { data: leads, error } = await query;

    if (error) {
      console.error('Database query error:', error);
      throw new Error(`Database query failed: ${error.message}`);
    }

    if (!leads || leads.length === 0) {
      console.log('⚠️ No leads found for export');
      return [];
    }

    console.log(`📋 Retrieved ${leads.length} leads from database`);

    // Process leads with notes formatting
    const processedLeads = leads.map(lead => ({
      ...lead,
      notes_formatted: formatNotes(lead),
      created_at: new Date(lead.created_at).toLocaleDateString(),
      updated_at: new Date(lead.updated_at).toLocaleDateString()
    }));

    // Apply column filtering if specified
    if (columns && Array.isArray(columns)) {
      return processedLeads.map(lead => {
        const filtered = {};
        columns.forEach(col => {
          if (lead.hasOwnProperty(col)) {
            filtered[col] = lead[col];
          }
        });
        return filtered;
      });
    }

    return processedLeads;

  } catch (error) {
    console.error('Error exporting leads:', error);
    throw error;
  }
}

// Export students data
async function exportStudents(accessibleUsernames, filters = {}, dateRange = null, columns = null) {
  try {
    let query = supabase
      .from('students')
      .select('*');

    // Apply username-based filtering
    if (accessibleUsernames && accessibleUsernames.length > 0) {
      query = query.or(`assigned_to.in.(${accessibleUsernames.join(',')}),created_by.in.(${accessibleUsernames.join(',')})`);
    }

    // Apply filters
    if (filters.course) {
      query = query.eq('course', filters.course);
    }
    if (filters.branch) {
      query = query.eq('branch', filters.branch);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    // Apply date range
    if (dateRange) {
      if (dateRange.start) {
        query = query.gte('created_at', dateRange.start);
      }
      if (dateRange.end) {
        query = query.lte('created_at', dateRange.end);
      }
    }

    query = query.order('created_at', { ascending: false });

    const { data: students, error } = await query;

    if (error) {
      throw new Error(`Database query failed: ${error.message}`);
    }

    if (!students) return [];

    // Format dates
    return students.map(student => ({
      ...student,
      created_at: new Date(student.created_at).toLocaleDateString(),
      updated_at: new Date(student.updated_at).toLocaleDateString()
    }));

  } catch (error) {
    console.error('Error exporting students:', error);
    throw error;
  }
}

// Export payments data
async function exportPayments(accessibleUsernames, filters = {}, dateRange = null, columns = null) {
  try {
    let query = supabase
      .from('payments')
      .select('*');

    // Apply username-based filtering
    if (accessibleUsernames && accessibleUsernames.length > 0) {
      query = query.or(`created_by.in.(${accessibleUsernames.join(',')}),processed_by.in.(${accessibleUsernames.join(',')})`);
    }

    // Apply filters
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.method) {
      query = query.eq('payment_method', filters.method);
    }

    // Apply date range
    if (dateRange) {
      if (dateRange.start) {
        query = query.gte('payment_date', dateRange.start);
      }
      if (dateRange.end) {
        query = query.lte('payment_date', dateRange.end);
      }
    }

    query = query.order('payment_date', { ascending: false });

    const { data: payments, error } = await query;

    if (error) {
      throw new Error(`Database query failed: ${error.message}`);
    }

    if (!payments) return [];

    // Format dates
    return payments.map(payment => ({
      ...payment,
      payment_date: new Date(payment.payment_date).toLocaleDateString(),
      created_at: new Date(payment.created_at).toLocaleDateString(),
      updated_at: new Date(payment.updated_at).toLocaleDateString()
    }));

  } catch (error) {
    console.error('Error exporting payments:', error);
    throw error;
  }
}

// Generate CSV format
function generateCSV(data) {
  if (!data || data.length === 0) {
    return '';
  }

  const headers = Object.keys(data[0]);
  const csvHeaders = headers.join(',');
  
  const csvRows = data.map(row => {
    return headers.map(header => {
      const value = row[header];
      if (value === null || value === undefined) {
        return '';
      }
      // Handle special formatting for notes
      if (header === 'notes_formatted') {
        return value; // Already formatted and escaped in formatNotes
      }
      // Escape other values
      return `"${String(value).replace(/"/g, '""')}"`;
    }).join(',');
  });

  return [csvHeaders, ...csvRows].join('\n');
}

// Generate Excel format (basic implementation)
function generateExcel(data) {
  // For now, return CSV format with Excel headers
  // A full Excel implementation would require additional libraries like xlsx
  const csv = generateCSV(data);
  return csv;
}

// Handle export status check
async function handleGetExportStatus(req, res) {
  try {
    const user = verifyToken(req);
    
    // Simple status response
    res.status(200).json({
      success: true,
      status: 'ready',
      message: 'Export service is available',
      user: user.username,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Status check error:', error);
    res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }
}