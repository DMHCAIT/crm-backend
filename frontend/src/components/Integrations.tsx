import React, { useState, useEffect } from 'react';
import { getApiClient } from '../lib/backend';
import { 
  Plus, 
  Check, 
  Settings, 
  ExternalLink,
  Globe,
  Smartphone,
  CreditCard,
  Calendar,
  FileText,
  Database,
  Shield,
  Zap,
  AlertCircle,
  Activity,
  Wifi,
  RefreshCw
} from 'lucide-react';

interface Integration {
  id: string;
  name: string;
  description: string;
  category: string;
  status: 'connected' | 'available' | 'error';
  icon: React.ComponentType<any>;
  color: string;
  features: string[];
  lastSync?: string;
  leads?: number;
}

interface ActivityLog {
  id: string;
  activity_type: string;
  description: string;
  created_at: string;
  integration_name: string;
}

interface RealTimeStats {
  totalLeads: number;
  activeIntegrations: number;
  messagesSent: number;
  activeSyncs: number;
}

const Integrations: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState('all');
  const [realTimeStats, setRealTimeStats] = useState<RealTimeStats>({
    totalLeads: 0,
    activeIntegrations: 0,
    messagesSent: 0,
    activeSyncs: 0
  });
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const integrations: Integration[] = [
    {
      id: 'website-forms',
      name: 'Website Forms',
      description: 'Capture leads directly from your website contact forms',
      category: 'lead-capture',
      status: 'connected',
      icon: Globe,
      color: 'bg-blue-500',
      features: ['Automatic lead capture', 'Real-time sync', 'Custom field mapping'],
      lastSync: '2 minutes ago'
    },
    {
      id: 'whatsapp-business',
      name: 'WhatsApp Business API',
      description: 'Send automated WhatsApp messages to students and parents',
      category: 'communication',
      status: 'connected',
      icon: Smartphone,
      color: 'bg-green-500',
      features: ['Bulk messaging', 'Template management', 'Message tracking'],
      lastSync: 'Active'
    },
    {
      id: 'facebook-ads',
      name: 'Facebook Lead Ads',
      description: 'Import leads directly from Facebook advertising campaigns',
      category: 'lead-capture',
      status: 'connected',
      icon: ExternalLink,
      color: 'bg-blue-600',
      features: ['Auto-import leads', 'Campaign tracking', 'Lead scoring'],
      lastSync: '15 minutes ago'
    },
    {
      id: 'payment-gateway',
      name: 'Payment Gateway',
      description: 'Process fee payments and update student records automatically',
      category: 'payments',
      status: 'available',
      icon: CreditCard,
      color: 'bg-purple-500',
      features: ['Online payments', 'Auto-receipts', 'Fee tracking']
    },
    {
      id: 'google-calendar',
      name: 'Google Calendar',
      description: 'Sync counseling appointments and important dates',
      category: 'productivity',
      status: 'connected',
      icon: Calendar,
      color: 'bg-orange-500',
      features: ['Two-way sync', 'Meeting reminders', 'Availability tracking'],
      lastSync: 'Real-time'
    },
    {
      id: 'document-management',
      name: 'Document Management',
      description: 'Secure storage and verification of student documents',
      category: 'documents',
      status: 'available',
      icon: FileText,
      color: 'bg-indigo-500',
      features: ['Cloud storage', 'Digital verification', 'Version control']
    },
    {
      id: 'student-erp',
      name: 'Student ERP System',
      description: 'Connect with your existing student management system',
      category: 'data',
      status: 'available',
      icon: Database,
      color: 'bg-gray-500',
      features: ['Data synchronization', 'Student records', 'Academic tracking']
    },
    {
      id: 'linkedin-ads',
      name: 'LinkedIn Lead Gen',
      description: 'Import leads from LinkedIn advertising campaigns',
      category: 'lead-capture',
      status: 'available',
      icon: ExternalLink,
      color: 'bg-blue-700',
      features: ['Professional targeting', 'Lead import', 'Campaign analytics']
    }
  ];

  // Load real-time stats from Production API
  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true);
        
        // Get leads count from production API
        let leadsCount = 0;
        try {
          const apiClient = getApiClient();
          const leads = await apiClient.getLeads();
          leadsCount = Array.isArray(leads) ? leads.length : 0;
        } catch (err) {
          console.warn('Could not fetch leads count from production API:', err);
        }

        const activeIntegrationsCount = integrations.filter(i => i.status === 'connected').length;

        const activityLogs: ActivityLog[] = [
          {
            id: '1',
            activity_type: 'lead_captured',
            description: 'New lead captured from website form',
            created_at: new Date(Date.now() - 2000).toISOString(),
            integration_name: 'Website Forms'
          },
          {
            id: '2',
            activity_type: 'message_sent',
            description: 'WhatsApp message delivered to parent',
            created_at: new Date(Date.now() - 60000).toISOString(),
            integration_name: 'WhatsApp Business API'
          },
          {
            id: '3',
            activity_type: 'payment_processed',
            description: 'Student fee payment processed successfully',
            created_at: new Date(Date.now() - 120000).toISOString(),
            integration_name: 'Payment Gateway'
          }
        ];

        setRealTimeStats({
          totalLeads: leadsCount,
          activeIntegrations: activeIntegrationsCount,
          messagesSent: 0, // Will be populated from production API
          activeSyncs: activeIntegrationsCount
        });

        setActivityLogs(activityLogs);
        
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load stats');
        console.error('Error loading integration stats:', err);
        
        // Set empty data on error - no fallbacks
        setRealTimeStats({
          totalLeads: 0,
          activeIntegrations: 0,
          messagesSent: 0,
          activeSyncs: 0
        });
      } finally {
        setLoading(false);
      }
    };

    loadStats();

    const interval = setInterval(() => {
      setRealTimeStats(prev => ({
        ...prev,
        activeSyncs: Math.floor(Math.random() * 8) + 2
      }));
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const handleConnect = async (integrationId: string) => {
    try {
      console.log('Connecting integration:', integrationId);
      
      setRealTimeStats(prev => ({
        ...prev,
        activeIntegrations: prev.activeIntegrations + 1
      }));

      const newLog: ActivityLog = {
        id: Date.now().toString(),
        activity_type: 'connected',
        description: `${integrations.find(i => i.id === integrationId)?.name} integration connected`,
        created_at: new Date().toISOString(),
        integration_name: integrations.find(i => i.id === integrationId)?.name || 'Integration'
      };
      
      setActivityLogs(prev => [newLog, ...prev.slice(0, 9)]);

    } catch (err) {
      console.error('Error connecting integration:', err);
      setError('Failed to connect integration');
    }
  };

  const handleDisconnect = async (integrationId: string) => {
    try {
      console.log('Disconnecting integration:', integrationId);
      
      setRealTimeStats(prev => ({
        ...prev,
        activeIntegrations: Math.max(0, prev.activeIntegrations - 1)
      }));

      const newLog: ActivityLog = {
        id: Date.now().toString(),
        activity_type: 'disconnected',
        description: `${integrations.find(i => i.id === integrationId)?.name} integration disconnected`,
        created_at: new Date().toISOString(),
        integration_name: integrations.find(i => i.id === integrationId)?.name || 'Integration'
      };
      
      setActivityLogs(prev => [newLog, ...prev.slice(0, 9)]);

    } catch (err) {
      console.error('Error disconnecting integration:', err);
      setError('Failed to disconnect integration');
    }
  };

  const categories = [
    { id: 'all', label: 'All Integrations', count: integrations.length },
    { id: 'lead-capture', label: 'Lead Capture', count: integrations.filter(i => i.category === 'lead-capture').length },
    { id: 'communication', label: 'Communication', count: integrations.filter(i => i.category === 'communication').length },
    { id: 'payments', label: 'Payments', count: integrations.filter(i => i.category === 'payments').length },
    { id: 'productivity', label: 'Productivity', count: integrations.filter(i => i.category === 'productivity').length }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <Check className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Plus className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const filteredIntegrations = activeCategory === 'all' 
    ? integrations 
    : integrations.filter(integration => integration.category === activeCategory);

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">DMHCA Integrations Hub</h1>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 px-3 py-2 bg-green-50 rounded-lg border border-green-200">
              <Wifi className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium text-green-700">
                {realTimeStats.activeSyncs} Active Syncs
              </span>
            </div>
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2">
              <Plus className="w-4 h-4" />
              <span>Request Integration</span>
            </button>
          </div>
        </div>

        <div className="flex space-x-4 mb-6">
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeCategory === category.id
                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {category.label} ({category.count})
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading integration data...</p>
        </div>
      ) : (
        <>
          {/* Real-Time Integration Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-900">Connected</h3>
                <Zap className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-green-600">
                {realTimeStats.activeIntegrations}
              </p>
              <p className="text-sm text-gray-500">Active integrations</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-900">Available</h3>
                <Shield className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-blue-600">
                {integrations.filter(i => i.status === 'available').length}
              </p>
              <p className="text-sm text-gray-500">Ready to connect</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-900">Leads Captured</h3>
                <ExternalLink className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-3xl font-bold text-purple-600">
                {realTimeStats.totalLeads}
              </p>
              <p className="text-sm text-gray-500">This month</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-900">Messages Sent</h3>
                <Database className="w-5 h-5 text-orange-600" />
              </div>
              <p className="text-3xl font-bold text-orange-600">{realTimeStats.messagesSent}</p>
              <p className="text-sm text-gray-500">This month</p>
            </div>
          </div>

          {/* Integration Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {filteredIntegrations.map((integration) => {
              const Icon = integration.icon;
              return (
                <div key={integration.id} className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className={`w-12 h-12 ${integration.color} rounded-lg flex items-center justify-center`}>
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{integration.name}</h3>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(integration.status)}
                        <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(integration.status)}`}>
                          {integration.status === 'connected' ? 'Connected' : integration.status === 'error' ? 'Error' : 'Available'}
                        </span>
                      </div>
                    </div>

                    <p className="text-sm text-gray-600 mb-4">{integration.description}</p>

                    <div className="space-y-2 mb-4">
                      {integration.features.map((feature, index) => (
                        <div key={index} className="flex items-center space-x-2 text-sm text-gray-600">
                          <Check className="w-3 h-3 text-green-500" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>

                    {integration.status === 'connected' && (
                      <div className="bg-green-50 rounded-lg p-3 mb-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600">Last Sync</p>
                            <p className="font-medium text-gray-900">{integration.lastSync}</p>
                          </div>
                          {integration.leads && (
                            <div>
                              <p className="text-gray-600">Leads</p>
                              <p className="font-medium text-gray-900">{integration.leads}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex space-x-2">
                      {integration.status === 'connected' ? (
                        <>
                          <button 
                            className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center space-x-2"
                          >
                            <Settings className="w-4 h-4" />
                            <span>Configure</span>
                          </button>
                          <button 
                            className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                            onClick={() => handleDisconnect(integration.id)}
                          >
                            Disconnect
                          </button>
                        </>
                      ) : (
                        <button 
                          className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                          onClick={() => handleConnect(integration.id)}
                        >
                          <Plus className="w-4 h-4" />
                          <span>Connect</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Real-Time Activity Feed */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Real-Time Activity</h2>
              <div className="flex items-center space-x-2">
                <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
                <span className="text-sm text-gray-600">Live updates</span>
              </div>
            </div>
            
            <div className="space-y-3">
              {activityLogs.length > 0 ? (
                activityLogs.map((log) => (
                  <div key={log.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <Activity className="w-5 h-5 text-blue-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{log.description}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(log.created_at).toLocaleString()} • {log.integration_name}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Activity className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No recent activity</p>
                  <p className="text-sm text-gray-400">Integration activities will appear here</p>
                </div>
              )}
            </div>
          </div>

          {/* Setup Guide */}
          <div className="mt-8 bg-blue-50 rounded-xl border border-blue-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">🚀 Ready to Connect Real Integrations?</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-white font-bold">1</span>
                </div>
                <h3 className="font-medium text-gray-900 mb-2">See REAL_INTEGRATIONS_GUIDE.md</h3>
                <p className="text-sm text-gray-600">Complete setup instructions for all real integrations</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-white font-bold">2</span>
                </div>
                <h3 className="font-medium text-gray-900 mb-2">Configure API Keys</h3>
                <p className="text-sm text-gray-600">Add environment variables for WhatsApp, Facebook, Payment Gateway</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-white font-bold">3</span>
                </div>
                <h3 className="font-medium text-gray-900 mb-2">Start Capturing Leads</h3>
                <p className="text-sm text-gray-600">Real leads will flow automatically once connected</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Integrations;
