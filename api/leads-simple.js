// 🚀 SIMPLIFIED LEADS API - NO DATABASE DEPENDENCY
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dmhca-crm-super-secret-production-key-2024';

// Demo leads data
const DEMO_LEADS = [
  {
    id: '1',
    fullName: 'John Smith',
    email: 'john.smith@email.com',
    phone: '+91-9876543210',
    country: 'India',
    branch: 'Mumbai',
    qualification: 'Bachelor of Engineering',
    source: 'Website',
    course: 'Web Development',
    status: 'new',
    assignedTo: 'admin',
    followUp: '2025-09-20',
    priority: 'high',
    notes: 'Interested in full-stack development course',
    createdAt: '2025-09-19T00:00:00.000Z',
    updatedAt: '2025-09-19T00:00:00.000Z'
  },
  {
    id: '2',
    fullName: 'Sarah Johnson',
    email: 'sarah.j@email.com',
    phone: '+91-9876543211',
    country: 'India',
    branch: 'Delhi',
    qualification: 'Masters in Computer Science',
    source: 'Referral',
    course: 'Data Science',
    status: 'contacted',
    assignedTo: 'admin',
    followUp: '2025-09-21',
    priority: 'medium',
    notes: 'Looking for data analytics career transition',
    createdAt: '2025-09-18T00:00:00.000Z',
    updatedAt: '2025-09-19T00:00:00.000Z'
  },
  {
    id: '3',
    fullName: 'Mike Davis',
    email: 'mike.davis@email.com',
    phone: '+91-9876543212',
    country: 'India',
    branch: 'Bangalore',
    qualification: 'BCA',
    source: 'Social Media',
    course: 'Mobile App Development',
    status: 'qualified',
    assignedTo: 'admin',
    followUp: '2025-09-22',
    priority: 'high',
    notes: 'Ready to start next batch',
    createdAt: '2025-09-17T00:00:00.000Z',
    updatedAt: '2025-09-19T00:00:00.000Z'
  }
];

// Verify JWT token
function verifyToken(req) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No valid token provided');
  }

  const token = authHeader.substring(7);
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    throw new Error('Invalid token');
  }
}

module.exports = async (req, res) => {
  // Simple CORS
  const origin = req.headers.origin;
  if (origin && (origin.includes('vercel.app') || origin.includes('crmdmhca.com') || origin.includes('localhost'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Verify authentication for all requests
    const user = verifyToken(req);
    console.log('🔍 Leads API request from:', user.username);

    // Handle different HTTP methods
    if (req.method === 'GET') {
      // Get all leads
      return res.json({
        success: true,
        leads: DEMO_LEADS,
        total: DEMO_LEADS.length,
        message: 'Leads retrieved successfully (demo data)'
      });
    }

    if (req.method === 'POST') {
      const { fullName, email, phone, course, source } = req.body;
      
      // Simulate creating a new lead
      const newLead = {
        id: String(DEMO_LEADS.length + 1),
        fullName: fullName || 'New Lead',
        email: email || 'newlead@email.com',
        phone: phone || '+91-0000000000',
        country: 'India',
        branch: 'Mumbai',
        qualification: 'Not specified',
        source: source || 'Manual',
        course: course || 'General Inquiry',
        status: 'new',
        assignedTo: user.username,
        followUp: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        priority: 'medium',
        notes: 'New lead created',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      return res.json({
        success: true,
        lead: newLead,
        message: 'Lead created successfully (demo mode)'
      });
    }

    if (req.method === 'PUT') {
      // Simulate updating a lead
      const leadId = req.url.split('/').pop();
      const existingLead = DEMO_LEADS.find(l => l.id === leadId);
      
      if (!existingLead) {
        return res.status(404).json({
          success: false,
          message: 'Lead not found'
        });
      }

      const updatedLead = {
        ...existingLead,
        ...req.body,
        updatedAt: new Date().toISOString()
      };

      return res.json({
        success: true,
        lead: updatedLead,
        message: 'Lead updated successfully (demo mode)'
      });
    }

    if (req.method === 'DELETE') {
      // Simulate deleting a lead
      const leadId = req.url.split('/').pop();
      
      return res.json({
        success: true,
        message: `Lead ${leadId} deleted successfully (demo mode)`
      });
    }

  } catch (error) {
    console.log('❌ Leads API error:', error.message);
    return res.status(401).json({
      success: false,
      message: error.message
    });
  }
};