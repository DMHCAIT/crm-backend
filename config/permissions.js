// 🔐 ROLE-BASED ACCESS CONTROL SYSTEM
// Defines what features each role can access

const ROLE_PERMISSIONS = {
  admin: {
    dashboard: true,
    crm_pipeline: true,
    lead_management: true,
    lead_monitoring: true,
    facebook_integration: true,
    unified_inbox: true,
    communications_hub: true,
    course_enrollments: true,
    crm_analytics: true,
    documents: true,
    automations: true,
    integrations: true,
    data_export: true,
    profile: true,
    user_management: true,
    user_restrictions: true,
    branch_management: true,
    super_admin_control: true,
    settings: true
  },
  
  super_admin: {
    dashboard: true,
    crm_pipeline: true,
    lead_management: true,
    lead_monitoring: true,
    facebook_integration: true,
    unified_inbox: true,
    communications_hub: true,
    course_enrollments: true,
    crm_analytics: true,
    documents: true,
    automations: true,
    integrations: true,
    data_export: true,
    profile: true,
    user_management: true,
    settings: true
  },
  
  senior_manager: {
    dashboard: true,
    crm_pipeline: true,
    lead_management: true,
    lead_monitoring: true,
    facebook_integration: true,
    unified_inbox: true,
    communications_hub: true,
    course_enrollments: true,
    crm_analytics: true,
    documents: true,
    automations: true,
    integrations: true,
    data_export: true,
    profile: true,
    user_management: true,
    settings: true
  },
  
  manager: {
    dashboard: true,
    crm_pipeline: true,
    lead_management: true,
    lead_monitoring: true,
    facebook_integration: false, // No access
    unified_inbox: true,
    communications_hub: true,
    course_enrollments: true,
    crm_analytics: true,
    documents: true,
    automations: true,
    integrations: false, // No access
    data_export: true,
    profile: true,
    user_management: true,
    settings: true
  },
  
  team_leader: {
    dashboard: true,
    crm_pipeline: true,
    lead_management: true,
    lead_monitoring: true,
    facebook_integration: false, // No access
    unified_inbox: true,
    communications_hub: true,
    course_enrollments: true,
    crm_analytics: true,
    documents: false, // No access
    automations: false, // No access
    integrations: false, // No access
    data_export: true,
    profile: true,
    user_management: false, // Limited access
    settings: false // No access
  },
  
  counselor: {
    dashboard: true,
    crm_pipeline: true,
    lead_management: true,
    lead_monitoring: true,
    facebook_integration: false, // No access
    unified_inbox: true,
    communications_hub: true,
    course_enrollments: true,
    crm_analytics: true,
    documents: false, // No access
    automations: false, // No access
    integrations: false, // No access
    data_export: true,
    profile: true,
    user_management: false, // No access
    settings: false // No access
  },
  
  // Fallback for unknown roles
  default: {
    dashboard: true,
    crm_pipeline: false,
    lead_management: false,
    lead_monitoring: false,
    facebook_integration: false,
    unified_inbox: false,
    communications_hub: false,
    course_enrollments: false,
    crm_analytics: false,
    documents: false,
    automations: false,
    integrations: false,
    data_export: false,
    profile: true,
    user_management: false,
    settings: false
  }
};

// Feature descriptions for better understanding
const FEATURE_DESCRIPTIONS = {
  dashboard: "Main dashboard with overview statistics",
  crm_pipeline: "View and manage sales pipeline stages",
  lead_management: "Create, edit, and manage leads",
  lead_monitoring: "Monitor lead progress and activities",
  facebook_integration: "Facebook Ads and Lead Gen integration",
  unified_inbox: "Centralized message management",
  communications_hub: "Email, WhatsApp, and call management",
  course_enrollments: "Student enrollment and course management",
  crm_analytics: "Reports and analytics dashboard",
  documents: "Document management and file uploads",
  automations: "Workflow automation and triggers",
  integrations: "Third-party integrations management",
  data_export: "Export data to various formats",
  profile: "User profile management",
  user_management: "Create and manage team members",
  user_restrictions: "Restrict user access for super admins",
  branch_management: "Manage branch access and restrictions", 
  super_admin_control: "Control super admin permissions and access",
  settings: "System settings and configuration"
};

// Role hierarchy (higher numbers have more permissions)
const ROLE_HIERARCHY = {
  admin: 110,
  super_admin: 100,
  senior_manager: 90,
  manager: 70,
  team_leader: 50,
  counselor: 30,
  default: 10
};

/**
 * Get permissions for a specific role
 * @param {string} role - User role
 * @returns {object} Permissions object
 */
function getRolePermissions(role) {
  const normalizedRole = role ? role.toLowerCase().replace(/[^a-z_]/g, '_') : 'default';
  return ROLE_PERMISSIONS[normalizedRole] || ROLE_PERMISSIONS.default;
}

/**
 * Check if a user has permission for a specific feature
 * @param {string} role - User role
 * @param {string} feature - Feature name
 * @returns {boolean} Has permission
 */
function hasPermission(role, feature) {
  const permissions = getRolePermissions(role);
  const normalizedFeature = feature ? feature.toLowerCase().replace(/[^a-z_]/g, '_') : '';
  return permissions[normalizedFeature] || false;
}

/**
 * Get user's access level based on role
 * @param {string} role - User role
 * @returns {number} Access level
 */
function getUserAccessLevel(role) {
  const normalizedRole = role ? role.toLowerCase().replace(/[^a-z_]/g, '_') : 'default';
  return ROLE_HIERARCHY[normalizedRole] || ROLE_HIERARCHY.default;
}

/**
 * Get all accessible features for a role
 * @param {string} role - User role
 * @returns {array} Array of accessible feature names
 */
function getAccessibleFeatures(role) {
  const permissions = getRolePermissions(role);
  return Object.keys(permissions).filter(feature => permissions[feature]);
}

/**
 * Get restricted features for a role
 * @param {string} role - User role
 * @returns {array} Array of restricted feature names
 */
function getRestrictedFeatures(role) {
  const permissions = getRolePermissions(role);
  return Object.keys(permissions).filter(feature => !permissions[feature]);
}

/**
 * Generate user permissions response
 * @param {string} role - User role
 * @returns {object} Complete permissions response
 */
function generateUserPermissions(role) {
  const permissions = getRolePermissions(role);
  const accessLevel = getUserAccessLevel(role);
  const accessible = getAccessibleFeatures(role);
  const restricted = getRestrictedFeatures(role);
  
  return {
    role: role,
    accessLevel: accessLevel,
    permissions: permissions,
    accessibleFeatures: accessible,
    restrictedFeatures: restricted,
    totalFeatures: Object.keys(permissions).length,
    accessibleCount: accessible.length,
    restrictedCount: restricted.length
  };
}

module.exports = {
  ROLE_PERMISSIONS,
  FEATURE_DESCRIPTIONS,
  ROLE_HIERARCHY,
  getRolePermissions,
  hasPermission,
  getUserAccessLevel,
  getAccessibleFeatures,
  getRestrictedFeatures,
  generateUserPermissions
};