// Vercel Serverless Function for Auth Login
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dmhca-crm-super-secret-production-key-2024';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

export default function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle OPTIONS preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  const { username, password } = req.body;
  
  // Authenticate user
  if (username === 'admin' && password === 'admin123') {
    const token = jwt.sign({ 
      userId: 'admin-1',
      username: 'admin',
      role: 'super_admin',
      roleLevel: 100
    }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    return res.json({
      success: true,
      token,
      user: {
        id: 'admin-1',
        username: 'admin', 
        email: 'admin@dmhca.com',
        name: 'Admin User',
        role: 'super_admin',
        roleLevel: 100
      },
      message: 'Login successful!'
    });
  } else {
    return res.status(401).json({
      success: false,
      error: 'Invalid credentials'
    });
  }
}