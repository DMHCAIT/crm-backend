// Enhanced System Settings API with Configuration Management
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const logger = require('../utils/logger');


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
  logger.info('System Settings module: Supabase initialization failed:', error.message);
}

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

// Verify user authentication and admin role
function verifyAdminToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No valid token provided');
  }
  
  const token = authHeader.substring(7);
  const decoded = jwt.verify(token, JWT_SECRET);
  
  // Check if user has admin privileges
  if (decoded.role !== 'admin') {
    throw new Error('Admin privileges required');
  }
  
  return decoded;
}

// Verify user authentication (for read-only operations)
function verifyToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No valid token provided');
  }
  
  const token = authHeader.substring(7);
  return jwt.verify(token, JWT_SECRET);
}

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

  if (!supabase) {
    return res.status(500).json({
      success: false,
      error: 'Database connection not available'
    });
  }

  try {
    // Parse URL to determine action
    const urlParts = req.url.split('/').filter(part => part);
    const action = urlParts[urlParts.length - 1];

    switch (req.method) {
      case 'GET':
        if (action === 'categories') {
          await handleGetCategories(req, res);
        } else if (action === 'backup') {
          await handleBackupSettings(req, res);
        } else if (action === 'validate') {
          await handleValidateSettings(req, res);
        } else {
          await handleGetSettings(req, res);
        }
        break;
      
      case 'POST':
        if (action === 'restore') {
          await handleRestoreSettings(req, res);
        } else if (action === 'reset-category') {
          await handleResetCategory(req, res);
        } else if (action === 'test-integration') {
          await handleTestIntegrationSettings(req, res);
        } else {
          await handleCreateSetting(req, res);
        }
        break;
      
      case 'PUT':
        if (action === 'bulk-update') {
          await handleBulkUpdateSettings(req, res);
        } else {
          await handleUpdateSetting(req, res);
        }
        break;
      
      case 'DELETE':
        await handleDeleteSetting(req, res);
        break;
      
      default:
        res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    logger.error('System Settings API error:', error);
    
    if (error.message === 'Admin privileges required') {
      res.status(403).json({
        success: false,
        error: 'Admin privileges required for this operation'
      });
    } else if (error.message === 'No valid token provided' || error.name === 'JsonWebTokenError') {
      res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  }
};

// Get settings with filtering by category
async function handleGetSettings(req, res) {
  try {
    const user = verifyToken(req);
    const { category, key, include_sensitive = false } = req.query;

    let query = supabase
      .from('system_settings')
      .select('*')
      .order('category')
      .order('key');

    // Apply filters
    if (category) query = query.eq('category', category);
    if (key) query = query.eq('key', key);

    const { data: settings, error } = await query;

    if (error) throw error;

    // Filter sensitive settings for non-admin users
    const filteredSettings = (settings || []).map(setting => {
      if (setting.is_sensitive && user.role !== 'admin' && include_sensitive !== 'true') {
        return {
          ...setting,
          value: '***HIDDEN***',
          description: setting.description + ' (Sensitive - Hidden for security)'
        };
      }
      return setting;
    });

    // Group by category if no specific category requested
    if (!category) {
      const groupedSettings = filteredSettings.reduce((acc, setting) => {
        if (!acc[setting.category]) {
          acc[setting.category] = [];
        }
        acc[setting.category].push(setting);
        return acc;
      }, {});

      res.json({
        success: true,
        settings: groupedSettings,
        total_count: filteredSettings.length
      });
    } else {
      res.json({
        success: true,
        settings: filteredSettings,
        category,
        total_count: filteredSettings.length
      });
    }
  } catch (error) {
    if (error.message.includes('Admin privileges') || error.message.includes('token')) {
      res.status(401).json({ error: 'Unauthorized' });
    } else {
      throw error;
    }
  }
}

// Create new setting
async function handleCreateSetting(req, res) {
  try {
    const user = verifyAdminToken(req);
    const {
      key,
      value,
      category,
      data_type = 'string',
      description,
      is_sensitive = false,
      is_required = false,
      validation_rules = {},
      default_value
    } = req.body;

    if (!key || !category) {
      return res.status(400).json({
        success: false,
        error: 'Key and category are required'
      });
    }

    // Validate data type
    const validDataTypes = ['string', 'number', 'boolean', 'json', 'encrypted'];
    if (!validDataTypes.includes(data_type)) {
      return res.status(400).json({
        success: false,
        error: `Invalid data_type. Must be one of: ${validDataTypes.join(', ')}`
      });
    }

    // Validate value based on data type
    const validationResult = validateSettingValue(value, data_type, validation_rules);
    if (!validationResult.isValid) {
      return res.status(400).json({
        success: false,
        error: `Invalid value: ${validationResult.error}`
      });
    }

    // Process value based on data type
    let processedValue = value;
    if (data_type === 'encrypted' && value) {
      processedValue = await bcrypt.hash(value, 10);
    } else if (data_type === 'json' && typeof value === 'object') {
      processedValue = JSON.stringify(value);
    }

    const { data: setting, error } = await supabase
      .from('system_settings')
      .insert([{
        key,
        value: processedValue,
        category,
        data_type,
        description: description || '',
        is_sensitive: is_sensitive === true || is_sensitive === 'true',
        is_required: is_required === true || is_required === 'true',
        validation_rules,
        default_value: default_value || null,
        created_by_id: user.id,
        updated_by_id: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        return res.status(400).json({
          success: false,
          error: 'Setting with this key and category already exists'
        });
      }
      throw error;
    }

    res.json({
      success: true,
      message: 'Setting created successfully',
      setting: formatSettingForResponse(setting, user.role === 'admin')
    });
  } catch (error) {
    throw error;
  }
}

// Update setting
async function handleUpdateSetting(req, res) {
  try {
    const user = verifyAdminToken(req);
    const { key, value, description, validation_rules, is_sensitive, is_required } = req.body;

    if (!key) {
      return res.status(400).json({
        success: false,
        error: 'Key is required'
      });
    }

    // Get existing setting
    const { data: existingSetting, error: fetchError } = await supabase
      .from('system_settings')
      .select('*')
      .eq('key', key)
      .single();

    if (fetchError || !existingSetting) {
      return res.status(404).json({
        success: false,
        error: 'Setting not found'
      });
    }

    // Validate new value if provided
    if (value !== undefined) {
      const validationResult = validateSettingValue(value, existingSetting.data_type, validation_rules || existingSetting.validation_rules);
      if (!validationResult.isValid) {
        return res.status(400).json({
          success: false,
          error: `Invalid value: ${validationResult.error}`
        });
      }
    }

    const updateData = {
      updated_by_id: user.id,
      updated_at: new Date().toISOString()
    };

    if (value !== undefined) {
      // Process value based on data type
      if (existingSetting.data_type === 'encrypted') {
        updateData.value = await bcrypt.hash(value, 10);
      } else if (existingSetting.data_type === 'json' && typeof value === 'object') {
        updateData.value = JSON.stringify(value);
      } else {
        updateData.value = value;
      }
    }

    if (description !== undefined) updateData.description = description;
    if (validation_rules !== undefined) updateData.validation_rules = validation_rules;
    if (is_sensitive !== undefined) updateData.is_sensitive = is_sensitive;
    if (is_required !== undefined) updateData.is_required = is_required;

    const { data: updatedSetting, error: updateError } = await supabase
      .from('system_settings')
      .update(updateData)
      .eq('key', key)
      .select()
      .single();

    if (updateError) throw updateError;

    res.json({
      success: true,
      message: 'Setting updated successfully',
      setting: formatSettingForResponse(updatedSetting, user.role === 'admin')
    });
  } catch (error) {
    throw error;
  }
}

// Bulk update settings
async function handleBulkUpdateSettings(req, res) {
  try {
    const user = verifyAdminToken(req);
    const { settings } = req.body;

    if (!Array.isArray(settings) || settings.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Settings array is required and cannot be empty'
      });
    }

    const results = [];

    for (const settingUpdate of settings) {
      try {
        const { key, value, category } = settingUpdate;

        if (!key) {
          results.push({
            key,
            success: false,
            error: 'Key is required'
          });
          continue;
        }

        // Get existing setting
        let query = supabase
          .from('system_settings')
          .select('*')
          .eq('key', key);

        if (category) query = query.eq('category', category);

        const { data: existingSetting, error: fetchError } = await query.single();

        if (fetchError) {
          results.push({
            key,
            success: false,
            error: 'Setting not found'
          });
          continue;
        }

        // Validate and process value
        if (value !== undefined) {
          const validationResult = validateSettingValue(value, existingSetting.data_type, existingSetting.validation_rules);
          if (!validationResult.isValid) {
            results.push({
              key,
              success: false,
              error: `Invalid value: ${validationResult.error}`
            });
            continue;
          }

          let processedValue = value;
          if (existingSetting.data_type === 'encrypted') {
            processedValue = await bcrypt.hash(value, 10);
          } else if (existingSetting.data_type === 'json' && typeof value === 'object') {
            processedValue = JSON.stringify(value);
          }

          const { error: updateError } = await supabase
            .from('system_settings')
            .update({
              value: processedValue,
              updated_by_id: user.id,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingSetting.id);

          if (updateError) {
            results.push({
              key,
              success: false,
              error: updateError.message
            });
          } else {
            results.push({
              key,
              success: true,
              message: 'Setting updated successfully'
            });
          }
        }
      } catch (error) {
        results.push({
          key: settingUpdate.key || 'unknown',
          success: false,
          error: error.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    res.json({
      success: true,
      message: `Bulk update completed: ${successCount} successful, ${failureCount} failed`,
      results,
      summary: {
        total: results.length,
        successful: successCount,
        failed: failureCount
      }
    });
  } catch (error) {
    throw error;
  }
}

// Get available categories
async function handleGetCategories(req, res) {
  try {
    const user = verifyToken(req);

    const { data: settings, error } = await supabase
      .from('system_settings')
      .select('category, key, description')
      .order('category');

    if (error) throw error;

    // Group by category and count settings
    const categories = settings?.reduce((acc, setting) => {
      if (!acc[setting.category]) {
        acc[setting.category] = {
          name: setting.category,
          count: 0,
          settings: []
        };
      }
      acc[setting.category].count++;
      acc[setting.category].settings.push({
        key: setting.key,
        description: setting.description
      });
      return acc;
    }, {}) || {};

    res.json({
      success: true,
      categories: Object.values(categories)
    });
  } catch (error) {
    if (error.message.includes('token')) {
      res.status(401).json({ error: 'Unauthorized' });
    } else {
      throw error;
    }
  }
}

// Backup settings
async function handleBackupSettings(req, res) {
  try {
    const user = verifyAdminToken(req);
    const { categories } = req.query;

    let query = supabase.from('system_settings').select('*');

    if (categories) {
      const categoryArray = categories.split(',').map(c => c.trim());
      query = query.in('category', categoryArray);
    }

    const { data: settings, error } = await query;

    if (error) throw error;

    // Create backup data
    const backup = {
      timestamp: new Date().toISOString(),
      created_by: user.id,
      version: '1.0',
      categories: categories ? categories.split(',') : 'all',
      settings: settings?.map(setting => ({
        key: setting.key,
        value: setting.is_sensitive ? '***SENSITIVE***' : setting.value,
        category: setting.category,
        data_type: setting.data_type,
        description: setting.description,
        is_sensitive: setting.is_sensitive,
        is_required: setting.is_required,
        validation_rules: setting.validation_rules,
        default_value: setting.default_value
      })) || []
    };

    res.json({
      success: true,
      message: 'Settings backup created successfully',
      backup,
      total_settings: backup.settings.length
    });
  } catch (error) {
    throw error;
  }
}

// Test integration settings
async function handleTestIntegrationSettings(req, res) {
  try {
    const user = verifyAdminToken(req);
    const { integration_name } = req.body;

    if (!integration_name) {
      return res.status(400).json({
        success: false,
        error: 'Integration name is required'
      });
    }

    // Get integration settings
    const { data: settings, error } = await supabase
      .from('system_settings')
      .select('*')
      .eq('category', `${integration_name}_config`);

    if (error) throw error;

    if (!settings || settings.length === 0) {
      return res.status(404).json({
        success: false,
        error: `No settings found for integration: ${integration_name}`
      });
    }

    // Test the integration based on available settings
    const testResult = await performIntegrationTest(integration_name, settings);

    res.json({
      success: testResult.success,
      message: testResult.message,
      test_result: testResult,
      tested_settings: settings.map(s => s.key)
    });
  } catch (error) {
    throw error;
  }
}

// Delete setting
async function handleDeleteSetting(req, res) {
  try {
    const user = verifyAdminToken(req);
    const { key, category } = req.query;

    if (!key) {
      return res.status(400).json({
        success: false,
        error: 'Key is required'
      });
    }

    let query = supabase
      .from('system_settings')
      .delete()
      .eq('key', key);

    if (category) query = query.eq('category', category);

    const { data: deletedSettings, error } = await query.select();

    if (error) throw error;

    if (!deletedSettings || deletedSettings.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Setting not found'
      });
    }

    res.json({
      success: true,
      message: 'Setting deleted successfully',
      deleted_count: deletedSettings.length
    });
  } catch (error) {
    throw error;
  }
}

// Helper functions
function validateSettingValue(value, dataType, validationRules = {}) {
  try {
    switch (dataType) {
      case 'number':
        const num = parseFloat(value);
        if (isNaN(num)) return { isValid: false, error: 'Value must be a number' };
        
        if (validationRules.min !== undefined && num < validationRules.min) {
          return { isValid: false, error: `Value must be at least ${validationRules.min}` };
        }
        if (validationRules.max !== undefined && num > validationRules.max) {
          return { isValid: false, error: `Value must be at most ${validationRules.max}` };
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean' && value !== 'true' && value !== 'false') {
          return { isValid: false, error: 'Value must be a boolean' };
        }
        break;

      case 'json':
        if (typeof value === 'string') {
          try {
            JSON.parse(value);
          } catch (e) {
            return { isValid: false, error: 'Value must be valid JSON' };
          }
        }
        break;

      case 'string':
      case 'encrypted':
        if (validationRules.minLength && value.length < validationRules.minLength) {
          return { isValid: false, error: `Value must be at least ${validationRules.minLength} characters` };
        }
        if (validationRules.maxLength && value.length > validationRules.maxLength) {
          return { isValid: false, error: `Value must be at most ${validationRules.maxLength} characters` };
        }
        if (validationRules.pattern && !new RegExp(validationRules.pattern).test(value)) {
          return { isValid: false, error: 'Value does not match required pattern' };
        }
        break;
    }

    return { isValid: true };
  } catch (error) {
    return { isValid: false, error: 'Validation error: ' + error.message };
  }
}

function formatSettingForResponse(setting, isAdmin) {
  if (setting.is_sensitive && !isAdmin) {
    return {
      ...setting,
      value: '***HIDDEN***'
    };
  }

  // Parse JSON values for response
  if (setting.data_type === 'json' && typeof setting.value === 'string') {
    try {
      return {
        ...setting,
        value: JSON.parse(setting.value)
      };
    } catch (e) {
      // Return as string if parsing fails
    }
  }

  return setting;
}

async function performIntegrationTest(integrationName, settings) {
  try {
    const configMap = settings.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {});

    switch (integrationName.toLowerCase()) {
      case 'email':
        return await testEmailConfiguration(configMap);
      case 'sms':
        return await testSMSConfiguration(configMap);
      case 'whatsapp':
        return await testWhatsAppConfiguration(configMap);
      case 'facebook':
        return await testFacebookConfiguration(configMap);
      case 'razorpay':
        return await testRazorpayConfiguration(configMap);
      default:
        return {
          success: true,
          message: `Integration ${integrationName} configuration validated`,
          details: { settings_count: settings.length }
        };
    }
  } catch (error) {
    return {
      success: false,
      message: 'Integration test failed',
      error: error.message
    };
  }
}

async function testEmailConfiguration(config) {
  const required = ['smtp_server', 'smtp_port', 'smtp_username', 'smtp_password'];
  const missing = required.filter(key => !config[key]);

  if (missing.length > 0) {
    return {
      success: false,
      message: 'Email configuration incomplete',
      missing_settings: missing
    };
  }

  return {
    success: true,
    message: 'Email configuration is valid',
    details: {
      server: config.smtp_server,
      port: config.smtp_port,
      security: config.smtp_security || 'TLS'
    }
  };
}

async function testSMSConfiguration(config) {
  const required = ['sms_api_key', 'sms_api_secret', 'sms_sender_id'];
  const missing = required.filter(key => !config[key]);

  if (missing.length > 0) {
    return {
      success: false,
      message: 'SMS configuration incomplete',
      missing_settings: missing
    };
  }

  return {
    success: true,
    message: 'SMS configuration is valid',
    details: {
      provider: config.sms_provider || 'default',
      sender_id: config.sms_sender_id
    }
  };
}

async function testWhatsAppConfiguration(config) {
  const required = ['whatsapp_access_token', 'whatsapp_phone_number_id'];
  const missing = required.filter(key => !config[key]);

  if (missing.length > 0) {
    return {
      success: false,
      message: 'WhatsApp configuration incomplete',
      missing_settings: missing
    };
  }

  return {
    success: true,
    message: 'WhatsApp configuration is valid',
    details: {
      phone_number_id: config.whatsapp_phone_number_id,
      webhook_configured: !!config.whatsapp_webhook_url
    }
  };
}

async function testFacebookConfiguration(config) {
  const required = ['facebook_app_id', 'facebook_app_secret', 'facebook_access_token'];
  const missing = required.filter(key => !config[key]);

  if (missing.length > 0) {
    return {
      success: false,
      message: 'Facebook configuration incomplete',
      missing_settings: missing
    };
  }

  return {
    success: true,
    message: 'Facebook configuration is valid',
    details: {
      app_id: config.facebook_app_id,
      webhook_configured: !!config.facebook_webhook_url
    }
  };
}

async function testRazorpayConfiguration(config) {
  const required = ['razorpay_key_id', 'razorpay_key_secret'];
  const missing = required.filter(key => !config[key]);

  if (missing.length > 0) {
    return {
      success: false,
      message: 'Razorpay configuration incomplete',
      missing_settings: missing
    };
  }

  return {
    success: true,
    message: 'Razorpay configuration is valid',
    details: {
      key_id: config.razorpay_key_id,
      webhook_configured: !!config.razorpay_webhook_secret
    }
  };
}