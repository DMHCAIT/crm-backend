// Authentication API Handler
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

module.exports = async (req, res) => {
  // Set CORS headers
  const allowedOrigins = ['https://www.crmdmhca.com', 'https://crmdmhca.com', 'http://localhost:5173'];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const urlParts = req.url.split('/');
  const endpoint = urlParts[urlParts.length - 1];

  try {
    switch (req.method) {
      case 'POST':
        if (endpoint === 'login') {
          await handleLogin(req, res);
        } else if (endpoint === 'register') {
          await handleRegister(req, res);
        } else if (endpoint === 'refresh') {
          await handleRefreshToken(req, res);
        } else {
          res.status(404).json({ error: 'Auth endpoint not found' });
        }
        break;

      case 'GET':
        if (endpoint === 'verify') {
          await handleVerifyToken(req, res);
        } else {
          res.status(404).json({ error: 'Auth endpoint not found' });
        }
        break;

      default:
        res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
};

async function handleLogin(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email and password are required'
    });
  }

  try {
    // Check if user exists in Supabase auth
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (signInError) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Try to get user profile from users table, fallback to auth data
    let userProfile = null;
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (!profileError && profileData) {
        userProfile = profileData;
      }
    } catch (profileErr) {
      console.warn('Could not fetch user profile:', profileErr.message);
    }

    // Use profile data if available, otherwise use auth data
    const userData = userProfile || {
      id: signInData.user.id,
      email: signInData.user.email,
      name: signInData.user.user_metadata?.name || email.split('@')[0],
      role: 'user'
    };

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: userData.id,
        email: userData.email,
        role: userData.role 
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      success: true,
      token,
      user: {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        role: userData.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed due to server error'
    });
  }
}

async function handleRegister(req, res) {
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({
      success: false,
      message: 'Email, password, and name are required'
    });
  }

  try {
    // Create user in Supabase auth
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name
        }
      }
    });

    if (signUpError) {
      return res.status(400).json({
        success: false,
        message: signUpError.message
      });
    }

    // Try to create user profile in users table, but don't fail if it doesn't work
    let userProfile = null;
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .insert([
          {
            id: signUpData.user.id,
            email,
            name,
            role: 'user',
            status: 'active',
            created_at: new Date().toISOString()
          }
        ])
        .select()
        .single();

      if (!profileError) {
        userProfile = profileData;
      } else {
        console.warn('Profile creation warning:', profileError.message);
      }
    } catch (profileErr) {
      console.warn('Profile table might not exist:', profileErr.message);
    }

    // Generate JWT token with user data from Supabase Auth
    const token = jwt.sign(
      { 
        id: signUpData.user.id,
        email: signUpData.user.email,
        name: name,
        role: 'user'
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      success: true,
      message: 'User registered successfully.',
      token,
      user: {
        id: signUpData.user.id,
        email: signUpData.user.email,
        name: name,
        role: userProfile ? userProfile.role : 'user'
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed due to server error'
    });
  }
}

async function handleVerifyToken(req, res) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'No valid token provided'
    });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Optionally verify user still exists and is active
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name, role, status')
      .eq('id', decoded.id)
      .eq('status', 'active')
      .single();

    if (error || !user) {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive'
      });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
}

async function handleRefreshToken(req, res) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'No valid token provided'
    });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Generate new token
    const newToken = jwt.sign(
      { 
        id: decoded.id,
        email: decoded.email,
        role: decoded.role 
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      success: true,
      token: newToken
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
}
