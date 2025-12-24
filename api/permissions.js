// 🔐 PERMISSIONS API - Role-based Access Control
const jwt = require('jsonwebtoken');
const { 
  getRolePermissions, 
  hasPermission, 
  getUserAccessLevel, 
  generateUserPermissions,
  FEATURE_DESCRIPTIONS 
} = require('../config/permissions');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

module.exports = async (req, res) => {
  // CORS Headers
  const origin = req.headers.origin;
  if (origin && (origin.includes('vercel.app') || origin.includes('crmdmhca.com') || origin.includes('localhost'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Verify JWT token
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const userRole = decoded.role || 'default';
    
    console.log('🔍 Permissions check for role:', userRole);

    if (req.method === 'GET') {
      const { feature } = req.query;
      
      // If specific feature is requested, check permission for that feature
      if (feature) {
        const hasAccess = hasPermission(userRole, feature);
        const featureDescription = FEATURE_DESCRIPTIONS[feature.toLowerCase().replace(/[^a-z_]/g, '_')] || 'Unknown feature';
        
        return res.json({
          success: true,
          feature: feature,
          hasAccess: hasAccess,
          description: featureDescription,
          userRole: userRole,
          message: hasAccess ? 'Access granted' : 'Access denied'
        });
      }
      
      // Return complete permissions for the user
      const userPermissions = generateUserPermissions(userRole);
      
      return res.json({
        success: true,
        data: userPermissions,
        message: 'Permissions retrieved successfully'
      });
    }

    if (req.method === 'POST') {
      // Bulk permission check
      const { features } = req.body;
      
      if (!features || !Array.isArray(features)) {
        return res.status(400).json({
          success: false,
          message: 'Features array is required'
        });
      }
      
      const results = features.map(feature => ({
        feature: feature,
        hasAccess: hasPermission(userRole, feature),
        description: FEATURE_DESCRIPTIONS[feature.toLowerCase().replace(/[^a-z_]/g, '_')] || 'Unknown feature'
      }));
      
      return res.json({
        success: true,
        userRole: userRole,
        results: results,
        message: 'Bulk permission check completed'
      });
    }

    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });

  } catch (error) {
    console.error('❌ Permissions API error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Permission check failed'
    });
  }
};