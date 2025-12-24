// 🚀 SYSTEM CONFIGURATION API - DYNAMIC DROPDOWN OPTIONS
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

// Initialize Supabase
let supabase;
try {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    console.log('✅ System Config API: Supabase initialized');
  } else {
    console.log('❌ System Config API: Supabase credentials missing');
  }
} catch (error) {
  console.log('❌ System Config API: Supabase initialization failed:', error.message);
}

// Default configuration keys
const CONFIG_KEYS = [
  'status_options',
  'priority_options', 
  'source_options',
  'branch_options',
  'experience_options',
  'countries',
  'qualification_options',
  'course_options'
];

function verifyToken(req) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) throw new Error('No token provided');
  
  const decoded = jwt.verify(token, JWT_SECRET);
  return decoded;
}

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const user = verifyToken(req);

    if (!supabase) {
      return res.status(500).json({
        success: false,
        error: 'Database connection not available',
        message: 'Supabase not initialized'
      });
    }

    // GET /api/system-config - Get all configuration or specific config
    if (req.method === 'GET') {
      const { configKey } = req.query;

      try {
        let query = supabase
          .from('system_config')
          .select('*')
          .order('config_key');

        if (configKey) {
          query = query.eq('config_key', configKey);
        }

        const { data: configs, error } = await query;

        if (error) {
          console.error('❌ Error fetching system config:', error.message);
          return res.status(500).json({
            success: false,
            error: 'Failed to fetch system configuration',
            details: error.message
          });
        }

        // Format response based on whether specific config was requested
        if (configKey) {
          const config = configs?.[0];
          if (!config) {
            return res.status(404).json({
              success: false,
              error: 'Configuration key not found'
            });
          }

          return res.json({
            success: true,
            config: {
              key: config.config_key,
              value: config.config_value,
              description: config.description,
              updatedBy: config.updated_by,
              updatedAt: config.updated_at
            },
            message: `Configuration for ${configKey} retrieved successfully`
          });
        } else {
          // Return all configurations formatted for easy use
          const formattedConfigs = {};
          configs?.forEach(config => {
            formattedConfigs[config.config_key] = config.config_value;
          });

          return res.json({
            success: true,
            configs: formattedConfigs,
            raw: configs || [],
            availableKeys: CONFIG_KEYS,
            message: `Found ${configs?.length || 0} configuration entries`
          });
        }

      } catch (error) {
        console.error('❌ Database error:', error.message);
        return res.status(500).json({
          success: false,
          error: 'Database operation failed',
          details: error.message
        });
      }
    }

    // POST /api/system-config - Create new configuration
    if (req.method === 'POST') {
      // Check if user has admin permissions
      if (user.role !== 'admin' && user.role !== 'super_admin') {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions to create system configuration'
        });
      }

      const { configKey, configValue, description } = req.body;

      // Validate required fields
      if (!configKey || !configValue) {
        return res.status(400).json({
          success: false,
          error: 'Config key and value are required'
        });
      }

      try {
        // Create or update configuration
        const configData = {
          config_key: configKey,
          config_value: configValue,
          description: description || '',
          updated_by: user.username || user.name || 'System'
        };

        const { data: insertedConfig, error } = await supabase
          .from('system_config')
          .upsert(configData, { onConflict: 'config_key' })
          .select()
          .single();

        if (error) {
          console.error('❌ Error creating/updating config:', error.message);
          return res.status(500).json({
            success: false,
            error: 'Failed to create/update configuration',
            details: error.message
          });
        }

        console.log(`✅ Created/updated config ${configKey} by ${user.username}`);

        return res.json({
          success: true,
          data: {
            key: insertedConfig.config_key,
            value: insertedConfig.config_value,
            description: insertedConfig.description,
            updatedBy: insertedConfig.updated_by,
            updatedAt: insertedConfig.updated_at
          },
          message: 'Configuration saved successfully'
        });

      } catch (error) {
        console.error('❌ Database error creating config:', error.message);
        return res.status(500).json({
          success: false,
          error: 'Database operation failed',
          details: error.message
        });
      }
    }

    // PUT /api/system-config - Update existing configuration
    if (req.method === 'PUT') {
      // Check if user has admin permissions
      if (user.role !== 'admin' && user.role !== 'super_admin') {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions to update system configuration'
        });
      }

      const { configKey, configValue, description } = req.body;

      if (!configKey) {
        return res.status(400).json({
          success: false,
          error: 'Config key is required'
        });
      }

      try {
        // Prepare update data
        const updateData = {
          updated_by: user.username || user.name || 'System',
          updated_at: new Date().toISOString()
        };

        if (configValue !== undefined) updateData.config_value = configValue;
        if (description !== undefined) updateData.description = description;

        // Update configuration
        const { data: updatedConfig, error } = await supabase
          .from('system_config')
          .update(updateData)
          .eq('config_key', configKey)
          .select()
          .single();

        if (error) {
          console.error('❌ Error updating config:', error.message);
          return res.status(500).json({
            success: false,
            error: 'Failed to update configuration',
            details: error.message
          });
        }

        if (!updatedConfig) {
          return res.status(404).json({
            success: false,
            error: 'Configuration key not found'
          });
        }

        console.log(`✅ Updated config ${configKey} by ${user.username}`);

        return res.json({
          success: true,
          data: {
            key: updatedConfig.config_key,
            value: updatedConfig.config_value,
            description: updatedConfig.description,
            updatedBy: updatedConfig.updated_by,
            updatedAt: updatedConfig.updated_at
          },
          message: 'Configuration updated successfully'
        });

      } catch (error) {
        console.error('❌ Database error updating config:', error.message);
        return res.status(500).json({
          success: false,
          error: 'Database operation failed',
          details: error.message
        });
      }
    }

    // DELETE /api/system-config - Delete configuration
    if (req.method === 'DELETE') {
      // Check if user has admin permissions
      if (user.role !== 'admin' && user.role !== 'super_admin') {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions to delete system configuration'
        });
      }

      const { configKey } = req.query;

      if (!configKey) {
        return res.status(400).json({
          success: false,
          error: 'Config key is required'
        });
      }

      try {
        // Delete configuration
        const { error } = await supabase
          .from('system_config')
          .delete()
          .eq('config_key', configKey);

        if (error) {
          console.error('❌ Error deleting config:', error.message);
          return res.status(500).json({
            success: false,
            error: 'Failed to delete configuration',
            details: error.message
          });
        }

        console.log(`✅ Deleted config ${configKey} by ${user.username}`);

        return res.json({
          success: true,
          message: 'Configuration deleted successfully'
        });

      } catch (error) {
        console.error('❌ Database error deleting config:', error.message);
        return res.status(500).json({
          success: false,
          error: 'Database operation failed',
          details: error.message
        });
      }
    }

    return res.status(405).json({ 
      success: false,
      error: 'Method not allowed' 
    });
    
  } catch (error) {
    console.error('❌ Authentication error:', error.message);
    return res.status(401).json({
      success: false,
      message: error.message
    });
  }
};