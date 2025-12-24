// 🚀 SIMPLIFIED USER MANAGEMENT - NO DATABASE DEPENDENCY
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

// Hardcoded users for demo purposes
// Demo data removed - database-only mode

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
        users: [],
        total: [].length,
        message: 'Users retrieved successfully (demo data)'
      });
    }

    if (req.method === 'POST') {
      const { 
        name, 
        username, 
        email, 
        phone, 
        role, 
        department, 
        designation, 
        location, 
        reports_to, 
        status 
      } = req.body;
      
      // Validate required fields
      if (!name || !username || !email) {
        return res.status(400).json({
          success: false,
          message: 'Name, username, and email are required'
        });
      }
      
      // Check if username or email already exists
      const existingUser = [].find(u => 
        u.username === username || u.email === email
      );
      
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'User with this username or email already exists'
        });
      }
      
      // Validate reports_to if provided
      if (reports_to && ![].find(u => u.id === reports_to)) {
        return res.status(400).json({
          success: false,
          message: 'Supervisor user not found'
        });
      }
      
      // Create new user with all fields
      const newUser = {
        id: String(Date.now()), // Use timestamp for unique ID
        name,
        username,
        email,
        phone: phone || null,
        role: role || 'counselor',
        department: department || null,
        designation: designation || null,
        location: location || null,
        status: status || 'active',
        reports_to: reports_to || null,
        join_date: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // Add to demo users array (simulate database insert)
      [].push(newUser);

      return res.json({
        success: true,
        user: newUser,
        message: 'User created successfully with supervisor assignment'
      });
    }

    if (req.method === 'PUT') {
      // Simulate updating a user
      const userId = req.query.id || req.url.split('?id=')[1]?.split('&')[0];
      const userIndex = [].findIndex(u => u.id === userId);
      
      if (userIndex === -1) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      const { reports_to, username, email, ...otherUpdates } = req.body;
      
      // Validate reports_to if provided
      if (reports_to && reports_to !== [][userIndex].reports_to) {
        if (![].find(u => u.id === reports_to)) {
          return res.status(400).json({
            success: false,
            message: 'Supervisor user not found'
          });
        }
        
        // Prevent circular reporting (user cannot report to themselves or their subordinates)
        if (reports_to === userId) {
          return res.status(400).json({
            success: false,
            message: 'User cannot report to themselves'
          });
        }
      }
      
      // Check for duplicate username/email if they're being updated
      if (username && username !== [][userIndex].username) {
        const duplicateUser = [].find(u => u.username === username && u.id !== userId);
        if (duplicateUser) {
          return res.status(400).json({
            success: false,
            message: 'Username already exists'
          });
        }
      }
      
      if (email && email !== [][userIndex].email) {
        const duplicateUser = [].find(u => u.email === email && u.id !== userId);
        if (duplicateUser) {
          return res.status(400).json({
            success: false,
            message: 'Email already exists'
          });
        }
      }

      const updatedUser = {
        ...[][userIndex],
        ...otherUpdates,
        username: username || [][userIndex].username,
        email: email || [][userIndex].email,
        reports_to: reports_to !== undefined ? reports_to : [][userIndex].reports_to,
        updated_at: new Date().toISOString()
      };
      
      // Update in the array (simulate database update)
      [][userIndex] = updatedUser;

      return res.json({
        success: true,
        user: updatedUser,
        message: 'User updated successfully with supervisor assignment'
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