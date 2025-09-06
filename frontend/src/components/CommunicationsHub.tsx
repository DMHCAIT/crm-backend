import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { 
  Mail, 
  MessageSquare, 
  Phone, 
  Send,
  Target,
  CheckCircle,
  Play,
  Pause,
  Plus,
  Search,
  BarChart3,
  Zap,
  Edit,
  Copy,
  Eye
} from 'lucide-react';

interface Campaign {
  id: string;
  name: string;
  type: 'email' | 'sms' | 'whatsapp' | 'phone';
  status: 'active' | 'paused' | 'completed' | 'draft';
  targetAudience: string;
  totalRecipients: number;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  responded: number;
  converted: number;
  createdAt: string;
  scheduledAt?: string;
  lastSent?: string;
  subject?: string;
  content: string;
  automationRules?: string[];
}

interface Communication {
  id: string;
  leadId: string;
  leadName: string;
  channel: 'email' | 'whatsapp' | 'sms' | 'phone';
  direction: 'inbound' | 'outbound';
  subject?: string;
  content: string;
  status: 'sent' | 'delivered' | 'read' | 'failed' | 'pending';
  timestamp: string;
  counselor: string;
  campaignId?: string;
}

const CommunicationsHub: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('campaigns');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Sample campaigns data
  const sampleCampaigns: Campaign[] = [
    {
      id: 'CAMP-001',
      name: 'Welcome Email Series',
      type: 'email',
      status: 'active',
      targetAudience: 'New Leads',
      totalRecipients: 250,
      sent: 245,
      delivered: 240,
      opened: 180,
      clicked: 85,
      responded: 42,
      converted: 18,
      createdAt: '2024-12-01T10:00:00Z',
      scheduledAt: '2024-12-01T10:00:00Z',
      lastSent: '2024-12-10T14:30:00Z',
      subject: 'Welcome to DMHCA - Your Medical Career Awaits',
      content: 'Welcome email with course information and next steps...',
      automationRules: ['Send immediately after lead creation', 'Follow up after 3 days if no response']
    },
    {
      id: 'CAMP-002',
      name: 'Fellowship Promotion',
      type: 'whatsapp',
      status: 'active',
      targetAudience: 'Interested in Fellowship',
      totalRecipients: 150,
      sent: 148,
      delivered: 145,
      opened: 120,
      clicked: 65,
      responded: 35,
      converted: 12,
      createdAt: '2024-11-15T09:00:00Z',
      scheduledAt: '2024-11-15T09:00:00Z',
      lastSent: '2024-12-09T16:20:00Z',
      content: 'Special fellowship program promotion with limited-time offer...',
      automationRules: ['Send to leads interested in fellowship courses', 'Exclude recent converters']
    },
    {
      id: 'CAMP-003',
      name: 'Follow-up Reminder',
      type: 'sms',
      status: 'paused',
      targetAudience: 'Hot Leads',
      totalRecipients: 75,
      sent: 70,
      delivered: 68,
      opened: 65,
      clicked: 25,
      responded: 18,
      converted: 8,
      createdAt: '2024-12-05T11:00:00Z',
      content: 'Quick reminder about pending enrollment...',
      automationRules: ['Send to hot leads after 48 hours of no contact']
    }
  ];

  // Sample communications data
  const sampleCommunications: Communication[] = [
    {
      id: 'COMM-001',
      leadId: 'LEAD-001',
      leadName: 'Dr. Rahul Sharma',
      channel: 'email',
      direction: 'outbound',
      subject: 'Cardiology Fellowship Information',
      content: 'Thank you for your interest in our Cardiology Fellowship program...',
      status: 'read',
      timestamp: '2024-12-10T14:30:00Z',
      counselor: 'Dr. Sarah Johnson',
      campaignId: 'CAMP-001'
    },
    {
      id: 'COMM-002',
      leadId: 'LEAD-002',
      leadName: 'Dr. Priya Patel',
      channel: 'whatsapp',
      direction: 'inbound',
      content: 'I am interested in the Emergency Medicine course. Can you send me more details?',
      status: 'delivered',
      timestamp: '2024-12-10T12:15:00Z',
      counselor: 'Dr. Michael Chen'
    },
    {
      id: 'COMM-003',
      leadId: 'LEAD-003',
      leadName: 'Dr. Amit Kumar',
      channel: 'phone',
      direction: 'outbound',
      content: 'Follow-up call regarding diabetes management certification',
      status: 'delivered',
      timestamp: '2024-12-10T10:45:00Z',
      counselor: 'Dr. Sarah Johnson'
    }
  ];

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      // In production, this would query Supabase
      setCampaigns(sampleCampaigns);
      setCommunications(sampleCommunications);
    } catch (error) {
      console.error('Error loading communications data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email': return <Mail className="w-4 h-4" />;
      case 'whatsapp': return <MessageSquare className="w-4 h-4" />;
      case 'sms': return <MessageSquare className="w-4 h-4" />;
      case 'phone': return <Phone className="w-4 h-4" />;
      default: return <Mail className="w-4 h-4" />;
    }
  };

  const getChannelColor = (channel: string) => {
    switch (channel) {
      case 'email': return 'bg-blue-100 text-blue-800';
      case 'whatsapp': return 'bg-green-100 text-green-800';
      case 'sms': return 'bg-purple-100 text-purple-800';
      case 'phone': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'paused': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'draft': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getConversionRate = (campaign: Campaign) => {
    return campaign.totalRecipients > 0 
      ? Math.round((campaign.converted / campaign.totalRecipients) * 100)
      : 0;
  };

  const getEngagementRate = (campaign: Campaign) => {
    return campaign.sent > 0 
      ? Math.round((campaign.clicked / campaign.sent) * 100)
      : 0;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Communications Hub</h1>
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => console.log('New Campaign functionality coming soon')}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>New Campaign</span>
            </button>
            <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2">
              <Zap className="w-4 h-4" />
              <span>Automation</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('campaigns')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'campaigns'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Campaigns
            </button>
            <button
              onClick={() => setActiveTab('communications')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'communications'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              All Communications
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'analytics'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Analytics
            </button>
          </nav>
        </div>
      </div>

      {/* Campaigns Tab */}
      {activeTab === 'campaigns' && (
        <div className="space-y-6">
          {/* Campaign Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Campaigns</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {campaigns.filter(c => c.status === 'active').length}
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <Target className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Sent</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {campaigns.reduce((sum, c) => sum + c.sent, 0)}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <Send className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Open Rate</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {Math.round(campaigns.reduce((sum, c) => sum + (c.opened / c.sent * 100), 0) / campaigns.length)}%
                  </p>
                </div>
                <div className="p-3 bg-purple-100 rounded-full">
                  <Eye className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Conversions</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {campaigns.reduce((sum, c) => sum + c.converted, 0)}
                  </p>
                </div>
                <div className="p-3 bg-emerald-100 rounded-full">
                  <CheckCircle className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Campaigns List */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Active Campaigns</h3>
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search campaigns..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="completed">Completed</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="divide-y divide-gray-200">
              {campaigns.map((campaign) => (
                <div key={campaign.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className={`p-2 rounded-lg ${getChannelColor(campaign.type)}`}>
                          {getChannelIcon(campaign.type)}
                        </div>
                        <div>
                          <h4 className="text-lg font-medium text-gray-900">{campaign.name}</h4>
                          <p className="text-sm text-gray-500">{campaign.targetAudience}</p>
                        </div>
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(campaign.status)}`}>
                          {campaign.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mt-4">
                        <div>
                          <p className="text-xs text-gray-500">Recipients</p>
                          <p className="text-sm font-medium text-gray-900">{campaign.totalRecipients}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Sent</p>
                          <p className="text-sm font-medium text-gray-900">{campaign.sent}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Opened</p>
                          <p className="text-sm font-medium text-gray-900">
                            {campaign.opened} ({Math.round((campaign.opened / campaign.sent) * 100)}%)
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Clicked</p>
                          <p className="text-sm font-medium text-gray-900">
                            {campaign.clicked} ({getEngagementRate(campaign)}%)
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Converted</p>
                          <p className="text-sm font-medium text-emerald-600">
                            {campaign.converted} ({getConversionRate(campaign)}%)
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Last Sent</p>
                          <p className="text-sm font-medium text-gray-900">
                            {campaign.lastSent ? formatDate(campaign.lastSent) : 'Never'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 ml-6">
                      {campaign.status === 'active' ? (
                        <button className="p-2 text-yellow-600 hover:text-yellow-700">
                          <Pause className="w-4 h-4" />
                        </button>
                      ) : campaign.status === 'paused' ? (
                        <button className="p-2 text-green-600 hover:text-green-700">
                          <Play className="w-4 h-4" />
                        </button>
                      ) : null}
                      <button className="p-2 text-blue-600 hover:text-blue-700">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-gray-600 hover:text-gray-700">
                        <Copy className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-gray-600 hover:text-gray-700">
                        <BarChart3 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Communications Tab */}
      {activeTab === 'communications' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Recent Communications</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {communications.map((comm) => (
              <div key={comm.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start space-x-4">
                  <div className={`p-2 rounded-lg ${getChannelColor(comm.channel)}`}>
                    {getChannelIcon(comm.channel)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">{comm.leadName}</h4>
                        <p className="text-xs text-gray-500">
                          {comm.direction === 'inbound' ? 'Received from' : 'Sent to'} lead
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">{formatDate(comm.timestamp)}</p>
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          comm.status === 'read' ? 'bg-green-100 text-green-800' :
                          comm.status === 'delivered' ? 'bg-blue-100 text-blue-800' :
                          comm.status === 'sent' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {comm.status}
                        </span>
                      </div>
                    </div>
                    {comm.subject && (
                      <p className="text-sm font-medium text-gray-900 mb-1">{comm.subject}</p>
                    )}
                    <p className="text-sm text-gray-600">{comm.content}</p>
                    <p className="text-xs text-gray-500 mt-2">Handled by {comm.counselor}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Channel Performance</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Mail className="w-5 h-5 text-blue-600" />
                  <span className="font-medium">Email</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-blue-600">72% Open Rate</p>
                  <p className="text-xs text-gray-500">245 sent</p>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <MessageSquare className="w-5 h-5 text-green-600" />
                  <span className="font-medium">WhatsApp</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-green-600">89% Read Rate</p>
                  <p className="text-xs text-gray-500">148 sent</p>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <MessageSquare className="w-5 h-5 text-purple-600" />
                  <span className="font-medium">SMS</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-purple-600">95% Delivery Rate</p>
                  <p className="text-xs text-gray-500">70 sent</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Conversion Funnel</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Messages Sent</span>
                <span className="text-sm font-medium">463</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Delivered</span>
                <span className="text-sm font-medium">453 (98%)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Opened/Read</span>
                <span className="text-sm font-medium">365 (81%)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Clicked/Responded</span>
                <span className="text-sm font-medium">175 (48%)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Converted</span>
                <span className="text-sm font-medium text-green-600">38 (22%)</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommunicationsHub;
