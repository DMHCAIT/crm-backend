import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getApiClient } from '../lib/backend';
import SystemStatus from './SystemStatus';
import { 
  TrendingUp, 
  Users, 
  GraduationCap, 
  DollarSign, 
  Phone, 
  Mail, 
  MessageSquare,
  UserPlus,
  Target,
  ArrowRight,
  Activity,
  FileText,
  BarChart3
} from 'lucide-react';

interface DashboardProps {
  onNavigate?: (section: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalLeads: 0,
    activeStudents: 0,
    revenue: 0,
    conversionRate: 0
  });
  const [crmStats, setCrmStats] = useState({
    hotLeads: 0,
    avgResponseTime: 0,
    pipelineValue: 0,
    monthlyConversions: 0,
    leadScore: 0,
    followUpsDue: 0
  });
  const [loading, setLoading] = useState(true);

  // Load real stats from production API
  useEffect(() => {
    const loadDashboardStats = async () => {
      try {
        setLoading(true);
        const apiClient = getApiClient();
        
        // Get leads data
        const leads = await apiClient.getLeads();
        const totalLeads = Array.isArray(leads) ? leads.length : 0;
        const hotLeads = Array.isArray(leads) ? leads.filter((lead: any) => lead.status === 'qualified' || lead.status === 'hot').length : 0;
        
        // Get analytics data
        const analytics: any = await apiClient.getAnalytics();
        
        setStats({
          totalLeads,
          activeStudents: analytics?.activeStudents || 0,
          revenue: analytics?.revenue || 0,
          conversionRate: analytics?.conversionRate || 0
        });
        
        setCrmStats({
          hotLeads,
          avgResponseTime: analytics?.avgResponseTime || 0,
          pipelineValue: analytics?.pipelineValue || 0,
          monthlyConversions: analytics?.monthlyConversions || 0,
          leadScore: analytics?.leadScore || 0,
          followUpsDue: analytics?.followUpsDue || 0
        });
        
        console.log('✅ Dashboard stats loaded from production API');
      } catch (error) {
        console.warn('⚠️ Failed to load dashboard stats:', error);
        // Keep default values (0s) if API fails
      } finally {
        setLoading(false);
      }
    };

    loadDashboardStats();
  }, []);

  // Enhanced Quick Actions with Navigation
  const quickActions = [
    {
      title: 'Add New Lead',
      description: 'Create a new lead entry',
      icon: UserPlus,
      color: 'bg-blue-500',
      action: () => onNavigate?.('leads'),
      count: loading ? 'Loading...' : `${stats.totalLeads} total`
    },
    {
      title: 'View Pipeline',
      description: 'Check CRM pipeline status',
      icon: Target,
      color: 'bg-green-500',
      action: () => onNavigate?.('crm-pipeline'),
      count: loading ? 'Loading...' : `₹${(crmStats.pipelineValue / 100000).toFixed(1)}L value`
    },
    {
      title: 'Communications',
      description: 'Send campaigns & messages',
      icon: MessageSquare,
      color: 'bg-purple-500',
      action: () => onNavigate?.('communications'),
      count: loading ? 'Loading...' : `${crmStats.followUpsDue} pending`
    },
    {
      title: 'Analytics',
      description: 'View detailed reports',
      icon: BarChart3,
      color: 'bg-orange-500',
      action: () => onNavigate?.('analytics'),
      count: loading ? 'Loading...' : 'Updated'
    }
  ];

  // Navigation Cards for Different Sections
  const navigationCards = [
    {
      title: 'Lead Management',
      description: 'Manage all your leads in one place',
      icon: Users,
      route: 'leads',
      stats: `${stats.totalLeads} Total Leads`,
      color: 'border-blue-200 bg-blue-50'
    },
    {
      title: 'Lead Monitoring',
      description: 'Monitor lead activities and scoring',
      icon: Activity,
      route: 'leads-monitoring',
      stats: `${crmStats.hotLeads} Hot Leads`,
      color: 'border-red-200 bg-red-50'
    },
    {
      title: 'Communications Hub',
      description: 'Manage campaigns and communications',
      icon: MessageSquare,
      route: 'communications',
      stats: '5 Active Campaigns',
      color: 'border-purple-200 bg-purple-50'
    },
    {
      title: 'Student Management',
      description: 'Track course enrollments',
      icon: GraduationCap,
      route: 'students',
      stats: `${stats.activeStudents} Active Students`,
      color: 'border-green-200 bg-green-50'
    },
    {
      title: 'Documents',
      description: 'Manage and organize documents',
      icon: FileText,
      route: 'documents',
      stats: loading ? 'Loading...' : '0 Documents', // Will be populated from API
      color: 'border-gray-200 bg-gray-50'
    },
    {
      title: 'CRM Analytics',
      description: 'Detailed insights and reports',
      icon: BarChart3,
      route: 'analytics',
      stats: `${stats.conversionRate}% Conversion`,
      color: 'border-yellow-200 bg-yellow-50'
    }
  ];

  // Recent Activities
  const recentActivities = [
    {
      id: 1,
      type: 'lead',
      message: 'New lead "John Smith" added',
      time: '2 minutes ago',
      icon: UserPlus,
      color: 'text-blue-600'
    },
    {
      id: 2,
      type: 'conversion',
      message: 'Lead "Sarah Wilson" converted to student',
      time: '15 minutes ago',
      icon: GraduationCap,
      color: 'text-green-600'
    },
    {
      id: 3,
      type: 'communication',
      message: 'Email campaign sent to leads',
      time: '1 hour ago',
      icon: Mail,
      color: 'text-purple-600'
    },
    {
      id: 4,
      type: 'follow-up',
      message: 'Follow-up call scheduled with Mike Chen',
      time: '2 hours ago',
      icon: Phone,
      color: 'text-orange-600'
    }
  ];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome back, {user?.name || 'User'}!
        </h1>
        <p className="text-gray-600">Here's what's happening with your CRM today.</p>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Leads</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalLeads}</p>
              <p className="text-sm text-green-600 mt-1">+12% from last month</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Students</p>
              <p className="text-3xl font-bold text-gray-900">{stats.activeStudents}</p>
              <p className="text-sm text-green-600 mt-1">+8% from last month</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Revenue</p>
              <p className="text-3xl font-bold text-gray-900">₹{(stats.revenue / 1000).toFixed(0)}K</p>
              <p className="text-sm text-green-600 mt-1">+15% from last month</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
              <p className="text-3xl font-bold text-gray-900">{stats.conversionRate}%</p>
              <p className="text-sm text-green-600 mt-1">+3% from last month</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="mb-8">
        <SystemStatus />
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <button
                key={index}
                onClick={action.action}
                className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow group"
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 ${action.color} rounded-lg flex items-center justify-center`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-gray-900">{action.title}</p>
                    <p className="text-sm text-gray-600">{action.count}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Navigation Cards */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">CRM Modules</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {navigationCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <div
                key={index}
                onClick={() => onNavigate?.(card.route)}
                className={`${card.color} p-6 rounded-xl border-2 cursor-pointer hover:shadow-md transition-all group`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
                    <Icon className="w-6 h-6 text-gray-700" />
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{card.title}</h3>
                <p className="text-sm text-gray-600 mb-3">{card.description}</p>
                <p className="text-sm font-medium text-gray-900">{card.stats}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activities</h3>
          <div className="space-y-4">
            {recentActivities.map((activity) => {
              const Icon = activity.icon;
              return (
                <div key={activity.id} className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Icon className={`w-4 h-4 ${activity.color}`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">{activity.message}</p>
                    <p className="text-xs text-gray-500">{activity.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CRM Performance */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">CRM Performance</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Hot Leads</span>
              <span className="text-sm font-medium text-gray-900">{crmStats.hotLeads}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Avg Response Time</span>
              <span className="text-sm font-medium text-gray-900">{crmStats.avgResponseTime}h</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Pipeline Value</span>
              <span className="text-sm font-medium text-gray-900">₹{(crmStats.pipelineValue / 1000).toFixed(0)}K</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Monthly Conversions</span>
              <span className="text-sm font-medium text-gray-900">{crmStats.monthlyConversions}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Lead Score Avg</span>
              <span className="text-sm font-medium text-gray-900">{crmStats.leadScore}/10</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Follow-ups Due</span>
              <span className="text-sm font-medium text-red-600">{crmStats.followUpsDue}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
