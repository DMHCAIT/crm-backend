// 🚀 SIMPLIFIED USER MANAGEMENT - NO DATABASE DEPENDENCY
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dmhca-crm-super-secret-production-key-2024';

// Hardcoded users for demo purposes
const DEMO_USERS = [
  {
    id: '1',
    name: 'Admin User',
    username: 'admin',
    email: 'admin@dmhca.com',
    role: 'admin',
    status: 'active',
    created_at: '2025-09-19T00:00:00.000Z',
    department: 'Management',
    designation: 'System Administrator'
  },
  {
    id: '2',
    name: 'John Doe',
    username: 'john.doe',
    email: 'john@dmhca.com',
    role: 'counselor',
    status: 'active',
    created_at: '2025-09-19T00:00:00.000Z',
    department: 'Admissions',
    designation: 'Senior Counselor'
  },
  {
    id: '3',
    name: 'Jane Smith',
    username: 'jane.smith',
    email: 'jane@dmhca.com',
    role: 'manager',
    status: 'active',
    created_at: '2025-09-19T00:00:00.000Z',
    department: 'Operations',
    designation: 'Operations Manager'
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
    console.log('🔍 User Management request from:', user.username);

    // Handle different endpoints
    if (req.method === 'GET') {
      // Get current user info
      if (req.url.includes('/me')) {
        return res.json({
          success: true,
          user: {
            id: '1',
            name: 'Admin User',
            username: user.username,
            email: 'admin@dmhca.com',
            role: user.role,
            status: 'active',
            department: 'Management',
            designation: 'System Administrator'
          }
        });
      }

      // Get all users
      return res.json({
        success: true,
        users: DEMO_USERS,
        total: DEMO_USERS.length,
        message: 'Users retrieved successfully (demo data)'
      });
    }

    if (req.method === 'POST') {
      const { name, email, role, department } = req.body;
      
      // Simulate creating a new user
      const newUser = {
        id: String(DEMO_USERS.length + 1),
        name: name || 'New User',
        username: email?.split('@')[0] || 'newuser',
        email: email || 'newuser@dmhca.com',
        role: role || 'counselor',
        status: 'active',
        created_at: new Date().toISOString(),
        department: department || 'General',
        designation: 'Staff Member'
      };

      return res.json({
        success: true,
        user: newUser,
        message: 'User created successfully (demo mode)'
      });
    }

    if (req.method === 'PUT') {
      // Simulate updating a user
      const userId = req.url.split('/').pop();
      const existingUser = DEMO_USERS.find(u => u.id === userId);
      
      if (!existingUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const updatedUser = {
        ...existingUser,
        ...req.body,
        updated_at: new Date().toISOString()
      };

      return res.json({
        success: true,
        user: updatedUser,
        message: 'User updated successfully (demo mode)'
      });
    }

    if (req.method === 'DELETE') {
      // Simulate deleting a user
      const userId = req.url.split('/').pop();
      
      return res.json({
        success: true,
        message: `User ${userId} deleted successfully (demo mode)`
      });
    }

  } catch (error) {
    console.log('❌ User Management error:', error.message);
    return res.status(401).json({
      success: false,
      message: error.message
    });
  }
};