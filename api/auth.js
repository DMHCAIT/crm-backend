// 🚀 HARDCODED ADMIN AUTHENTICATION - NO DATABASE NEEDED
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'simple-secret-key';

module.exports = async (req, res) => {
  // Simple CORS
  const origin = req.headers.origin;
  if (origin && (origin.includes('vercel.app') || origin.includes('crmdmhca.com') || origin.includes('localhost'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Handle different auth endpoints
  if (req.method === 'POST') {
    return await handleUltraSimpleLogin(req, res);
  }

  if (req.method === 'GET') {
    return await handleTokenVerification(req, res);
  }

  res.status(404).json({ error: 'Not found' });
};

// 🚀 HARDCODED ADMIN LOGIN - NO DATABASE DEPENDENCY
async function handleUltraSimpleLogin(req, res) {
  const { username, password } = req.body;

  console.log('🚀 Hardcoded Admin Login attempt:', username);

  // Simple validation
  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: 'Username and password required'
    });
  }

  try {
    // HARDCODED ADMIN CREDENTIALS - NO DATABASE NEEDED
    const ADMIN_USERNAME = 'admin';
    const ADMIN_PASSWORD = 'admin123';

    // Direct credential check
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      // Create JWT for successful login
      const token = jwt.sign({
        username: ADMIN_USERNAME,
        role: 'admin',
        loginTime: Date.now()
      }, JWT_SECRET, { expiresIn: '24h' });

      console.log('✅ Hardcoded admin login successful for:', username);

      return res.json({
        success: true,
        token: token,
        user: {
          username: ADMIN_USERNAME,
          role: 'admin'
        },
        message: 'Login successful'
      });
    } else {
      console.log('❌ Invalid credentials for:', username);
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }

  } catch (error) {
    console.error('❌ Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
}

// 🔐 TOKEN VERIFICATION FUNCTION
async function handleTokenVerification(req, res) {
  console.log('🔍 Token verification requested');
  
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    // Verify the JWT token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    console.log('✅ Token verified for user:', decoded.username);

    return res.json({
      success: true,
      user: {
        username: decoded.username,
        role: decoded.role
      },
      message: 'Token valid'
    });

  } catch (error) {
    console.log('❌ Token verification failed:', error.message);
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
}