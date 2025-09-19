// 🚀 SIMPLIFIED WORKING LEADS API
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dmhca-crm-super-secret-production-key-2024';

// Status options
const STATUS_OPTIONS = ['hot', 'warm', 'follow-up', 'enrolled', 'fresh', 'not interested'];

// Countries
const COUNTRIES = ['India', 'United States', 'United Kingdom', 'Canada', 'Australia', 'Germany', 'France', 'Japan', 'Singapore', 'UAE'];

// Demo leads
const LEADS_DATA = [
  {
    id: '1',
    fullName: 'John Smith',
    email: 'john@email.com',
    phone: '+91-9876543210',
    country: 'India',
    status: 'hot',
    notes: 'Interested in course',
    createdAt: '2025-09-19T10:00:00Z'
  },
  {
    id: '2', 
    fullName: 'Sarah Johnson',
    email: 'sarah@email.com',
    phone: '+91-9876543211',
    country: 'India',
    status: 'warm',
    notes: 'Follow up needed',
    createdAt: '2025-09-18T10:00:00Z'
  }
];

function verifyToken(req) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) throw new Error('No token provided');
  
  const decoded = jwt.verify(token, JWT_SECRET);
  return decoded;
}

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const user = verifyToken(req);
    
    if (req.method === 'GET') {
      return res.json({
        success: true,
        leads: LEADS_DATA,
        config: {
          statusOptions: STATUS_OPTIONS,
          countries: COUNTRIES
        },
        message: 'Leads retrieved successfully'
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
    
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: error.message
    });
  }
};