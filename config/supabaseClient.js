const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase with error handling
let supabase;

try {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.warn('⚠️ Supabase credentials not configured');
    console.warn('SUPABASE_URL:', process.env.SUPABASE_URL ? 'Set' : 'Missing');
    console.warn('SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? 'Set' : 'Missing');
  } else {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    console.log('✅ Supabase client initialized successfully');
  }
} catch (error) {
  console.error('❌ Supabase client initialization failed:', error);
}

module.exports = {
  supabase
};
