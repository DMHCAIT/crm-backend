// 🚀 SIMPLIFIED COMMUNICATIONS API - NO DATABASE DEPENDENCY
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dmhca-crm-super-secret-production-key-2024';

// Demo communications data
const DEMO_COMMUNICATIONS = [
  {
    id: '1',
    type: 'email',
    direction: 'outbound',
    subject: 'Welcome to DMHCA CRM',
    content: 'Thank you for your interest in our courses...',
    sender: 'admin@dmhca.com',
    recipient: 'john.smith@email.com',
    status: 'sent',
    created_at: '2025-09-19T10:00:00.000Z',
    delivered_at: '2025-09-19T10:01:00.000Z'
  },
  {
    id: '2',
    type: 'whatsapp',
    direction: 'inbound',
    subject: 'Course Inquiry',
    content: 'Hi, I want to know about data science course',
    sender: 'sarah.j@email.com',
    recipient: 'admin@dmhca.com',
    status: 'read',
    created_at: '2025-09-19T11:30:00.000Z',
    read_at: '2025-09-19T11:35:00.000Z'
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
    console.log('🔍 Communications API request from:', user.username);

    // Handle different HTTP methods
    if (req.method === 'GET') {
      // Get all communications
      return res.json({
        success: true,
        communications: DEMO_COMMUNICATIONS,
        total: DEMO_COMMUNICATIONS.length,
        message: 'Communications retrieved successfully (demo data)'
      });
    }

    if (req.method === 'POST') {
      const { type, subject, content, recipient } = req.body;
      
      // Simulate creating a new communication
      const newCommunication = {
        id: String(DEMO_COMMUNICATIONS.length + 1),
        type: type || 'email',
        direction: 'outbound',
        subject: subject || 'New Message',
        content: content || 'Message content...',
        sender: user.username + '@dmhca.com',
        recipient: recipient || 'customer@email.com',
        status: 'sent',
        created_at: new Date().toISOString(),
        delivered_at: new Date().toISOString()
      };

      return res.json({
        success: true,
        communication: newCommunication,
        message: 'Communication sent successfully (demo mode)'
      });
    }

    return res.json({
      success: true,
      message: 'Communications API working (demo mode)'
    });

  } catch (error) {
    console.log('❌ Communications API error:', error.message);
    return res.status(401).json({
      success: false,
      message: error.message
    });
  }
};