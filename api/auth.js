// Authentication API Handler
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

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
  console.log('Auth module: Supabase initialization failed:', error.message);
}

const JWT_SECRET = process.env.JWT_SECRET || 'dmhca-crm-super-secure-jwt-secret-2025';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

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

  const urlParts = req.url.split('/');
  const endpoint = urlParts[urlParts.length - 1];

  try {
    switch (req.method) {
      case 'POST':
        if (endpoint === 'login') {
          await handleLogin(req, res);
        } else if (endpoint === 'register') {
          await handleRegister(req, res);
        } else if (endpoint === 'logout') {
          await handleLogout(req, res);
        } else if (endpoint === 'refresh') {
          await handleRefreshToken(req, res);
        } else {
          res.status(404).json({ error: 'Auth endpoint not found' });
        }
        break;

      case 'GET':
        if (endpoint === 'verify') {
          await handleVerifyToken(req, res);
        } else if (endpoint === 'sessions') {
          await handleGetUserSessions(req, res);
        } else {
          res.status(404).json({ error: 'Auth endpoint not found' });
        }
        break;

      case 'DELETE':
        if (endpoint === 'revoke-session') {
          await handleRevokeSession(req, res);
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
    // Simple credential check for immediate production use
    const adminCredentials = [
      { email: 'admin@crm.com', password: 'admin123', name: 'CRM Administrator', role: 'super_admin' },
      { email: 'santhosh@dmhca.edu', password: 'admin123', name: 'Santhosh DMHCA', role: 'super_admin' },
      { email: 'demo@crm.com', password: 'demo123', name: 'Demo User', role: 'admin' }
    ];

    const validUser = adminCredentials.find(user => 
      user.email.toLowerCase() === email.toLowerCase() && user.password === password
    );

    if (validUser) {
      // Generate JWT token for valid user
      const user = {
        id: `admin-${Date.now()}`,
        email: validUser.email,
        name: validUser.name,
        role: validUser.role,
        permissions: ['read', 'write', 'admin'],
        isActive: true,
        createdAt: new Date().toISOString()
      };

      const token = jwt.sign(user, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

      console.log(`✅ Login successful: ${validUser.email} (${validUser.role})`);

      return res.json({
        success: true,
        token,
        user,
        message: 'Login successful'
      });
    }

    // Try database authentication as fallback
    const { data: dbUser, error: dbError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (dbUser && dbUser.password_hash) {
      let isValidPassword = false;
      
      // Check if password is bcrypt hash or plaintext
      if (dbUser.password_hash.startsWith('$2')) {
        // It's a bcrypt hash
        isValidPassword = await bcrypt.compare(password, dbUser.password_hash);
      } else {
        // It's plaintext (for your existing user: santhosh@dmhca.in / Santhu@123)
        isValidPassword = (password === dbUser.password_hash);
      }
      
      if (isValidPassword) {
        // Generate JWT token for database user with GUARANTEED super_admin role
        const user = {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name || dbUser.username,
          username: dbUser.username,
          role: 'super_admin', // FORCE super_admin for all database users
          department: dbUser.department || 'IT Administration',
          designation: dbUser.designation || 'System Administrator',
          permissions: ['read', 'write', 'admin', 'super_admin'],
          isActive: true, // Force active
          createdAt: dbUser.created_at
        };

        const token = jwt.sign(user, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

        console.log(`✅ Database login successful: ${dbUser.email} (${dbUser.role})`);

        return res.json({
          success: true,
          token,
          user,
          message: 'Login successful'
        });
      }
    }

    // Also check with alternate email formats
    if (email === 'santhosh@dmhca.in' || email === 'santhosh@dmhca.edu') {
      const { data: altUser, error: altError } = await supabase
        .from('users')
        .select('*')
        .ilike('email', '%santhosh%')
        .single();

      if (altUser && (password === 'Santhu@123' || password === altUser.password_hash)) {
        const user = {
          id: altUser.id,
          email: altUser.email,
          name: altUser.name || altUser.username || 'Santhosh DMHCA',
          username: altUser.username,
          role: 'super_admin', // FORCE super_admin
          department: altUser.department || 'IT Administration',
          designation: altUser.designation || 'Senior Developer', 
          permissions: ['read', 'write', 'admin', 'super_admin'],
          isActive: true,
          createdAt: altUser.created_at
        };

        const token = jwt.sign(user, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

        console.log(`✅ Database login successful: ${altUser.email} (${altUser.role})`);

        return res.json({
          success: true,
          token,
          user,
          message: 'Login successful'
        });
      }
    }

    // If no direct database match, try Supabase auth
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

    // Log the login session
    const sessionId = await createUserSession(userData.id, req);

    res.json({
      success: true,
      token,
      user: {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        role: userData.role
      },
      session_id: sessionId
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
    
    console.log('✅ Token verification successful:', decoded.email);
    
    // Always return success for valid JWT tokens
    const user = {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name || decoded.username || 'User',
      role: decoded.role || 'admin',
      permissions: decoded.permissions || ['read', 'write'],
      isActive: decoded.isActive !== false,
      department: decoded.department,
      designation: decoded.designation
    };

    return res.json({
      success: true,
      user: user,
      valid: true,
      message: 'Token is valid'
    });

  } catch (error) {
    console.error('❌ Token verification error:', error.message);
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
      valid: false
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

async function handleLogout(req, res) {
  try {
    // For JWT-based auth, logout is handled client-side by removing the token
    // We can optionally log the logout event or invalidate tokens server-side
    
    const authHeader = req.headers.authorization;
    let userId = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, JWT_SECRET);
        userId = decoded.id;
      } catch (error) {
        // Token might be expired, that's OK for logout
      }
    }

    // Optionally log the logout event
    if (userId && supabase) {
      try {
        await supabase
          .from('user_sessions')
          .update({ 
            status: 'logged_out',
            logged_out_at: new Date().toISOString()
          })
          .eq('user_id', userId)
          .eq('status', 'active');
      } catch (error) {
        // Ignore session logging errors
        console.log('Session logging error:', error.message);
      }
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during logout'
    });
  }
}

// Enhanced User Session Management Functions

async function createUserSession(userId, req) {
  try {
    if (!supabase) return null;

    const sessionData = {
      user_id: userId,
      ip_address: getClientIP(req),
      user_agent: req.headers['user-agent'] || 'Unknown',
      status: 'active',
      created_at: new Date().toISOString(),
      last_activity: new Date().toISOString()
    };

    const { data: session, error } = await supabase
      .from('user_sessions')
      .insert([sessionData])
      .select()
      .single();

    if (error) {
      console.error('Failed to create user session:', error);
      return null;
    }

    return session.id;
  } catch (error) {
    console.error('Session creation error:', error);
    return null;
  }
}

async function handleGetUserSessions(req, res) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'No valid token provided'
      });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.id;

    const { limit = 10, offset = 0, status } = req.query;

    let query = supabase
      .from('user_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: sessions, error } = await query;

    if (error) throw error;

    // Add session metadata
    const sessionsWithMetadata = sessions?.map(session => ({
      ...session,
      is_current_session: isCurrentSession(session, req),
      device_info: parseUserAgent(session.user_agent),
      location_info: getLocationFromIP(session.ip_address)
    })) || [];

    res.json({
      success: true,
      sessions: sessionsWithMetadata,
      total_count: sessionsWithMetadata.length
    });
  } catch (error) {
    console.error('Get user sessions error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch user sessions',
        details: error.message
      });
    }
  }
}

async function handleRevokeSession(req, res) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'No valid token provided'
      });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.id;

    const { sessionId } = req.query;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Session ID is required'
      });
    }

    // Verify the session belongs to the user
    const { data: session, error: fetchError } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    // Revoke the session
    const { error: revokeError } = await supabase
      .from('user_sessions')
      .update({
        status: 'revoked',
        revoked_at: new Date().toISOString(),
        revoked_by: userId
      })
      .eq('id', sessionId);

    if (revokeError) throw revokeError;

    res.json({
      success: true,
      message: 'Session revoked successfully',
      session_id: sessionId
    });
  } catch (error) {
    console.error('Revoke session error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to revoke session',
        details: error.message
      });
    }
  }
}

// Helper functions for session management
function getClientIP(req) {
  return req.headers['x-forwarded-for'] ||
         req.headers['x-real-ip'] ||
         req.connection?.remoteAddress ||
         req.socket?.remoteAddress ||
         (req.connection?.socket ? req.connection.socket.remoteAddress : null) ||
         'Unknown';
}

function isCurrentSession(session, req) {
  const currentIP = getClientIP(req);
  const currentUserAgent = req.headers['user-agent'] || 'Unknown';
  
  return session.ip_address === currentIP && 
         session.user_agent === currentUserAgent &&
         session.status === 'active';
}

function parseUserAgent(userAgent) {
  if (!userAgent || userAgent === 'Unknown') {
    return { browser: 'Unknown', os: 'Unknown', device: 'Unknown' };
  }

  // Simple user agent parsing (can be enhanced with a proper library)
  let browser = 'Unknown';
  let os = 'Unknown';
  let device = 'Desktop';

  // Browser detection
  if (userAgent.includes('Chrome')) browser = 'Chrome';
  else if (userAgent.includes('Firefox')) browser = 'Firefox';
  else if (userAgent.includes('Safari')) browser = 'Safari';
  else if (userAgent.includes('Edge')) browser = 'Edge';

  // OS detection
  if (userAgent.includes('Windows')) os = 'Windows';
  else if (userAgent.includes('Mac')) os = 'macOS';
  else if (userAgent.includes('Linux')) os = 'Linux';
  else if (userAgent.includes('Android')) os = 'Android';
  else if (userAgent.includes('iOS')) os = 'iOS';

  // Device detection
  if (userAgent.includes('Mobile') || userAgent.includes('Android')) device = 'Mobile';
  else if (userAgent.includes('Tablet') || userAgent.includes('iPad')) device = 'Tablet';

  return { browser, os, device };
}

function getLocationFromIP(ipAddress) {
  // Mock implementation - integrate with IP geolocation service
  return {
    country: 'Unknown',
    city: 'Unknown',
    region: 'Unknown'
  };
}
