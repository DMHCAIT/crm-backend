import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { 
  TrendingUp, 
  Users, 
  Target, 
  DollarSign, 
  Phone, 
  Mail, 
  Clock,
  Star,
  AlertCircle,
  CheckCircle,
  Activity,
  Calendar,
  Zap,
  Award,
  Eye,
  Download
} from 'lucide-react';

interface PipelineStats {
  totalLeads: number;
  newLeads: number;
  hotLeads: number;
  qualifiedLeads: number;
  convertedLeads: number;
  conversionRate: number;
  avgResponseTime: number;
  revenue: number;
  avgDealSize: number;
  monthlyGrowth: number;
}

interface LeadActivity {
  id: string;
  leadName: string;
  activity: string;
  timestamp: string;
  status: string;
  counselor: string;
}

const CRMPipeline: React.FC = () => {
  const { user } = useAuth();
  const [pipelineStats, setPipelineStats] = useState<PipelineStats>({
    totalLeads: 0,
    newLeads: 0,
    hotLeads: 0,
    qualifiedLeads: 0,
    convertedLeads: 0,
    conversionRate: 0,
    avgResponseTime: 0,
    revenue: 0,
    avgDealSize: 0,
    monthlyGrowth: 0
  });
  
  const [recentActivities, setRecentActivities] = useState<LeadActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');

  useEffect(() => {
    loadPipelineData();
  }, [user, timeRange]);

  const loadPipelineData = async () => {
    try {
      setLoading(true);
      
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      switch (timeRange) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
        default:
          startDate.setDate(endDate.getDate() - 7);
      }

      // Sample data for demonstration
      const sampleStats: PipelineStats = {
        totalLeads: 124,
        newLeads: 23,
        hotLeads: 18,
        qualifiedLeads: 45,
        convertedLeads: 31,
        conversionRate: 68.4,
        avgResponseTime: 2.4,
        revenue: 8750000,
        avgDealSize: 282258,
        monthlyGrowth: 15.2
      };

      const sampleActivities: LeadActivity[] = [
        {
          id: '1',
          leadName: 'Dr. Rahul Sharma',
          activity: 'Scheduled demo call',
          timestamp: '2 minutes ago',
          status: 'hot_lead',
          counselor: 'Dr. Sarah Johnson'
        },
        {
          id: '2',
          leadName: 'Dr. Priya Patel',
          activity: 'Downloaded course brochure',
          timestamp: '15 minutes ago',
          status: 'interested',
          counselor: 'Dr. Michael Chen'
        },
        {
          id: '3',
          leadName: 'Dr. Amit Kumar',
          activity: 'Responded to email campaign',
          timestamp: '1 hour ago',
          status: 'follow_up',
          counselor: 'Dr. Sarah Johnson'
        },
        {
          id: '4',
          leadName: 'Dr. Neha Gupta',
          activity: 'Converted to student',
          timestamp: '2 hours ago',
          status: 'converted',
          counselor: 'Dr. Michael Chen'
        },
        {
          id: '5',
          leadName: 'Dr. Kiran Singh',
          activity: 'Initial contact made',
          timestamp: '3 hours ago',
          status: 'contacted',
          counselor: 'Dr. Sarah Johnson'
        }
      ];

      setPipelineStats(sampleStats);
      setRecentActivities(sampleActivities);
      
    } catch (error) {
      console.error('Error loading pipeline data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (activity: string) => {
    if (activity.includes('call')) return <Phone className="w-4 h-4 text-blue-500" />;
    if (activity.includes('email')) return <Mail className="w-4 h-4 text-green-500" />;
    if (activity.includes('demo')) return <Eye className="w-4 h-4 text-purple-500" />;
    if (activity.includes('converted')) return <CheckCircle className="w-4 h-4 text-emerald-500" />;
    if (activity.includes('download')) return <Download className="w-4 h-4 text-orange-500" />;
    return <Activity className="w-4 h-4 text-gray-500" />;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'hot_lead': return 'bg-red-100 text-red-800 border-red-200';
      case 'interested': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'contacted': return 'bg-green-100 text-green-800 border-green-200';
      case 'follow_up': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'converted': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
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
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">CRM Pipeline Dashboard</h1>
          <div className="flex items-center space-x-4">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2">
              <Download className="w-4 h-4" />
              <span>Export Report</span>
            </button>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Leads</p>
              <p className="text-2xl font-bold text-gray-900">{pipelineStats.totalLeads}</p>
              <p className="text-sm text-green-600 flex items-center mt-1">
                <TrendingUp className="w-3 h-3 mr-1" />
                +{pipelineStats.monthlyGrowth}% vs last month
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
              <p className="text-2xl font-bold text-gray-900">{pipelineStats.conversionRate}%</p>
              <p className="text-sm text-green-600 flex items-center mt-1">
                <TrendingUp className="w-3 h-3 mr-1" />
                +5.2% vs last month
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
              <p className="text-sm font-medium text-gray-600">Revenue</p>
              <p className="text-2xl font-bold text-gray-900">₹{(pipelineStats.revenue / 1000000).toFixed(1)}M</p>
              <p className="text-sm text-green-600 flex items-center mt-1">
                <TrendingUp className="w-3 h-3 mr-1" />
                +12.3% vs last month
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <DollarSign className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Response Time</p>
              <p className="text-2xl font-bold text-gray-900">{pipelineStats.avgResponseTime}h</p>
              <p className="text-sm text-green-600 flex items-center mt-1">
                <TrendingUp className="w-3 h-3 mr-1" />
                -0.8h vs last month
              </p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Pipeline Stages */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Lead Pipeline</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Star className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-gray-900">New Leads</span>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-blue-600">{pipelineStats.newLeads}</p>
                <p className="text-sm text-gray-600">This week</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Zap className="w-5 h-5 text-red-600" />
                <span className="font-medium text-gray-900">Hot Leads</span>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-red-600">{pipelineStats.hotLeads}</p>
                <p className="text-sm text-gray-600">Ready to convert</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Award className="w-5 h-5 text-yellow-600" />
                <span className="font-medium text-gray-900">Qualified Leads</span>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-yellow-600">{pipelineStats.qualifiedLeads}</p>
                <p className="text-sm text-gray-600">In negotiation</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-medium text-gray-900">Converted</span>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-green-600">{pipelineStats.convertedLeads}</p>
                <p className="text-sm text-gray-600">This month</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 rounded-lg transition-colors">
              <span className="text-gray-700">Follow up overdue leads</span>
              <AlertCircle className="w-5 h-5 text-orange-500" />
            </button>
            <button className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 rounded-lg transition-colors">
              <span className="text-gray-700">Send weekly digest</span>
              <Mail className="w-5 h-5 text-blue-500" />
            </button>
            <button className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 rounded-lg transition-colors">
              <span className="text-gray-700">Schedule demo calls</span>
              <Calendar className="w-5 h-5 text-green-500" />
            </button>
            <button className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 rounded-lg transition-colors">
              <span className="text-gray-700">Review hot leads</span>
              <Star className="w-5 h-5 text-red-500" />
            </button>
          </div>
        </div>
      </div>

      {/* Recent Activities */}
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Recent Activities</h3>
          <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
            View All
          </button>
        </div>
        <div className="space-y-4">
          {recentActivities.map((activity) => (
            <div key={activity.id} className="flex items-center space-x-4 p-3 hover:bg-gray-50 rounded-lg transition-colors">
              {getActivityIcon(activity.activity)}
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{activity.leadName}</p>
                <p className="text-sm text-gray-600">{activity.activity}</p>
              </div>
              <div className="text-right">
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(activity.status)}`}>
                  {activity.status.replace('_', ' ')}
                </span>
                <p className="text-xs text-gray-500 mt-1">{activity.timestamp}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CRMPipeline;
