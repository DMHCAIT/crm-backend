// Enhanced error handling middleware for better debugging
const errorHandler = (req, res, error, context = 'API') => {
  console.error(`❌ ${context} Error:`, {
    url: req.url,
    method: req.method,
    error: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  });

  // Supabase specific error handling
  if (error.code === 'PGRST116') {
    return res.status(500).json({
      success: false,
      error: 'Database table does not exist',
      message: 'Please run the database setup script: node setup-database.js',
      details: error.message
    });
  }

  if (error.code === 'ECONNREFUSED' || error.message.includes('SUPABASE')) {
    return res.status(500).json({
      success: false,
      error: 'Database connection failed',
      message: 'Please check your Supabase credentials in .env file',
      details: error.message
    });
  }

  if (error.message.includes('JWT') || error.message.includes('token')) {
    return res.status(401).json({
      success: false,
      error: 'Authentication failed',
      message: 'Invalid or expired token',
      details: error.message
    });
  }

  // Generic error response
  return res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: 'An unexpected error occurred',
    details: process.env.NODE_ENV === 'development' ? error.message : 'Contact administrator'
  });
};

// Supabase connection checker
const checkSupabaseConnection = async (supabase) => {
  if (!supabase) {
    throw new Error('Supabase client not initialized. Check your environment variables.');
  }
  
  try {
    // Simple health check
    const { error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
      
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    return true;
  } catch (err) {
    throw new Error(`Supabase connection failed: ${err.message}`);
  }
};

module.exports = {
  errorHandler,
  checkSupabaseConnection
};