import React, { useState } from 'react';
import { 
  Zap, 
  Plus, 
  Play, 
  Pause, 
  Settings, 
  Clock, 
  Users, 
  MessageSquare,
  Mail,
  Phone,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Calendar,
  Target,
  Eye
} from 'lucide-react';

const Automations: React.FC = () => {
  const [activeTab, setActiveTab] = useState('workflows');

  const workflows = [
    {
      id: 1,
      name: 'New Lead Welcome Sequence',
      description: 'Automated welcome series for new leads with course information',
      status: 'active',
      trigger: 'New lead capture',
      actions: 5,
      conversions: 234,
      enrolled: 89,
      conversionRate: 38,
      lastTriggered: '2 minutes ago'
    },
    {
      id: 2,
      name: 'MBBS Application Follow-up',
      description: 'Follow-up sequence for MBBS program applicants',
      status: 'active',
      trigger: 'Course interest: MBBS',
      actions: 7,
      conversions: 156,
      enrolled: 67,
      conversionRate: 43,
      lastTriggered: '15 minutes ago'
    },
    {
      id: 3,
      name: 'Document Submission Reminders',
      description: 'Automated reminders for pending document submissions',
      status: 'active',
      trigger: 'Document pending > 3 days',
      actions: 3,
      conversions: 78,
      enrolled: 45,
      conversionRate: 58,
      lastTriggered: '1 hour ago'
    },
    {
      id: 4,
      name: 'Fee Payment Overdue',
      description: 'Payment reminder sequence for overdue fees',
      status: 'paused',
      trigger: 'Payment overdue > 7 days',
      actions: 4,
      conversions: 45,
      enrolled: 23,
      conversionRate: 51,
      lastTriggered: '2 days ago'
    }
  ];

  const followUpRules = [
    {
      id: 1,
      name: 'Hot Lead Immediate Follow-up',
      condition: 'Lead score > 80',
      action: 'Assign to senior counselor + WhatsApp within 5 minutes',
      priority: 'high',
      status: 'active'
    },
    {
      id: 2,
      name: 'NEET Score Based Assignment',
      condition: 'NEET score > 600',
      action: 'Auto-assign to MBBS counselor + Send MBBS brochure',
      priority: 'high',
      status: 'active'
    },
    {
      id: 3,
      name: 'Geography Based Distribution',
      condition: 'Location: Delhi/NCR',
      action: 'Assign to Delhi counselor + Schedule campus visit',
      priority: 'medium',
      status: 'active'
    },
    {
      id: 4,
      name: 'Inactive Lead Re-engagement',
      condition: 'No activity for 7 days',
      action: 'Send WhatsApp + Email with success stories',
      priority: 'low',
      status: 'active'
    }
  ];

  const assignmentRules = [
    {
      id: 1,
      name: 'Round Robin - MBBS Leads',
      condition: 'Course Interest: MBBS',
      distribution: 'Round Robin',
      counselors: ['Dr. Sarah Johnson', 'Dr. Michael Chen', 'Dr. Priya Sharma'],
      leads: 234,
      status: 'active'
    },
    {
      id: 2,
      name: 'Specialized - MD Programs',
      condition: 'Course Interest: MD Specialization',
      distribution: 'Expertise Based',
      counselors: ['Dr. Robert Wilson', 'Dr. Lisa Anderson'],
      leads: 89,
      status: 'active'
    },
    {
      id: 3,
      name: 'VIP - High Value Leads',
      condition: 'Lead Score > 90 OR Parent is Doctor',
      distribution: 'Senior Counselor',
      counselors: ['Dr. Sarah Johnson'],
      leads: 45,
      status: 'active'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600';
      case 'medium':
        return 'text-yellow-600';
      case 'low':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  const tabs = [
    { id: 'workflows', label: 'Workflow Automation', icon: Zap },
    { id: 'followup', label: 'Follow-up Rules', icon: Clock },
    { id: 'assignment', label: 'Auto-Assignment', icon: Users }
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">DMHCA Automation Center</h1>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2">
            <Plus className="w-4 h-4" />
            <span>Create Automation</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Automation Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-900">Active Workflows</h3>
            <Zap className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-blue-600">12</p>
          <p className="text-sm text-gray-500">Running automations</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-900">Leads Processed</h3>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-green-600">2,847</p>
          <p className="text-sm text-gray-500">This month</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-900">Conversion Rate</h3>
            <Target className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-3xl font-bold text-purple-600">42.8%</p>
          <p className="text-sm text-gray-500">Automated workflows</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-900">Time Saved</h3>
            <Clock className="w-5 h-5 text-orange-600" />
          </div>
          <p className="text-3xl font-bold text-orange-600">156h</p>
          <p className="text-sm text-gray-500">This month</p>
        </div>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'workflows' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Workflow Automation</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {workflows.map((workflow) => (
              <div key={workflow.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                      <Zap className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{workflow.name}</h3>
                      <p className="text-sm text-gray-500">{workflow.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className={`px-3 py-1 text-sm font-medium rounded-full border ${getStatusColor(workflow.status)}`}>
                      {workflow.status.charAt(0).toUpperCase() + workflow.status.slice(1)}
                    </span>
                    <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                      {workflow.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                    <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                      <Settings className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-xl font-bold text-gray-900">{workflow.actions}</p>
                    <p className="text-sm text-gray-500">Actions</p>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <p className="text-xl font-bold text-blue-600">{workflow.conversions}</p>
                    <p className="text-sm text-gray-500">Triggered</p>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <p className="text-xl font-bold text-green-600">{workflow.enrolled}</p>
                    <p className="text-sm text-gray-500">Enrolled</p>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <p className="text-xl font-bold text-purple-600">{workflow.conversionRate}%</p>
                    <p className="text-sm text-gray-500">Conversion</p>
                  </div>
                  <div className="text-center p-3 bg-orange-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-900">{workflow.lastTriggered}</p>
                    <p className="text-sm text-gray-500">Last Triggered</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    <strong>Trigger:</strong> {workflow.trigger}
                  </div>
                  <div className="flex space-x-2">
                    <button className="text-blue-600 hover:bg-blue-50 px-3 py-1 rounded transition-colors text-sm">
                      <Eye className="w-4 h-4 inline mr-1" />
                      View Details
                    </button>
                    <button className="text-gray-600 hover:bg-gray-50 px-3 py-1 rounded transition-colors text-sm">
                      Edit
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'followup' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Follow-up Automation Rules</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {followUpRules.map((rule) => (
              <div key={rule.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                      <Clock className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{rule.name}</h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <AlertCircle className={`w-4 h-4 ${getPriorityColor(rule.priority)}`} />
                        <span className={`text-sm font-medium ${getPriorityColor(rule.priority)}`}>
                          {rule.priority.toUpperCase()} PRIORITY
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className={`px-3 py-1 text-sm font-medium rounded-full border ${getStatusColor(rule.status)}`}>
                    {rule.status.charAt(0).toUpperCase() + rule.status.slice(1)}
                  </span>
                </div>

                <div className="ml-14 space-y-2">
                  <div className="text-sm">
                    <strong className="text-gray-700">Condition:</strong>
                    <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                      {rule.condition}
                    </span>
                  </div>
                  <div className="text-sm">
                    <strong className="text-gray-700">Action:</strong>
                    <span className="ml-2 text-gray-600">{rule.action}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'assignment' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Auto-Assignment Rules</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {assignmentRules.map((rule) => (
              <div key={rule.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{rule.name}</h3>
                      <p className="text-sm text-gray-500">{rule.distribution} Distribution</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-gray-600">{rule.leads} leads assigned</span>
                    <span className={`px-3 py-1 text-sm font-medium rounded-full border ${getStatusColor(rule.status)}`}>
                      {rule.status.charAt(0).toUpperCase() + rule.status.slice(1)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Assignment Condition</h4>
                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{rule.condition}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Assigned Counselors</h4>
                    <div className="flex flex-wrap gap-2">
                      {rule.counselors.map((counselor, index) => (
                        <span key={index} className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                          {counselor}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Automations;