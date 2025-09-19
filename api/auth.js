// 🚀 ULTRA-SIMPLE AUTHENTICATION - NO COMPLICATIONS
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

// Initialize Supabase
let supabase;
try {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    console.log('✅ Ultra-Simple Auth: Database connected');
  }
} catch (error) {
  console.log('❌ Ultra-Simple Auth: Database failed:', error.message);
}

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

  // Only handle login
  if (req.method === 'POST') {
    return await handleUltraSimpleLogin(req, res);
  }

  res.status(404).json({ error: 'Not found' });
};

// 🚀 ULTRA-SIMPLE LOGIN FUNCTION - NO COMPLICATIONS
async function handleUltraSimpleLogin(req, res) {
  const { username, password } = req.body;

  console.log('🚀 Ultra-Simple Login attempt:', username);

  // Simple validation
  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: 'Username and password required'
    });
  }

  try {
    // Check database connection
    if (!supabase) {
      console.log('❌ No database connection');
      return res.status(500).json({
        success: false,
        message: 'Database not available'
      });
    }

    // Simple database query - exact username and password match
    const { data: user, error } = await supabase
      .from('login_users')
      .select('*')
      .eq('username', username)
      .eq('password', password)
      .single();

    if (error || !user) {
      console.log('❌ Login failed for:', username, error?.message);
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }

    // Create simple JWT
    const token = jwt.sign({
      username: user.username,
      role: 'admin',
      loginTime: Date.now()
    }, JWT_SECRET, { expiresIn: '24h' });

    console.log('✅ Login successful for:', username);

    return res.json({
      success: true,
      token: token,
      user: {
        username: user.username,
        role: 'admin'
      },
      message: 'Login successful'
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
}