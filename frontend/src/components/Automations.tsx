import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { 
  Zap, 
  Clock, 
  Users, 
  Play, 
  Pause, 
  Settings,
  Activity,
  TrendingUp,
  Bell
} from 'lucide-react';

const Automations: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('workflows');
  const [loading, setLoading] = useState(true);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [followUpRules, setFollowUpRules] = useState<any[]>([]);
  const [assignmentRules, setAssignmentRules] = useState<any[]>([]);

  useEffect(() => {
    loadAutomationData();
  }, [user]);

  const loadAutomationData = async () => {
    try {
      setLoading(true);
      
      // For now, we'll create basic automation data based on real system capabilities
      // In a full implementation, these would come from a dedicated automations API
      
      const workflowData = [
        {
          id: 1,
          name: 'New Lead Welcome Sequence',
          description: 'Automated welcome series for new leads with course information',
          status: 'active',
          trigger: 'New lead capture',
          actions: 3,
          conversions: 0,
          enrolled: 0,
          conversionRate: 0,
          lastTriggered: 'Never'
        },
        {
          id: 2,
          name: 'Follow-up Automation',
          description: 'Automated follow-up for leads based on status',
          status: 'active',
          trigger: 'Lead status change',
          actions: 2,
          conversions: 0,
          enrolled: 0,
          conversionRate: 0,
          lastTriggered: 'Never'
        }
      ];

      const followUpData = [
        {
          id: 1,
          name: 'Hot Lead Immediate Follow-up',
          condition: 'Lead score > 80',
          action: 'Assign to senior counselor + immediate notification',
          priority: 'high',
          status: 'active',
          triggerCount: 0
        },
        {
          id: 2,
          name: 'New Lead Response',
          condition: 'New lead created',
          action: 'Send welcome email within 5 minutes',
          priority: 'medium',
          status: 'active',
          triggerCount: 0
        }
      ];

      const assignmentData = [
        {
          id: 1,
          name: 'Round Robin Assignment',
          criteria: 'All new leads',
          assignment: 'Distribute equally among available counselors',
          status: 'active',
          assignmentCount: 0
        }
      ];

      setWorkflows(workflowData);
      setFollowUpRules(followUpData);
      setAssignmentRules(assignmentData);

    } catch (error) {
      console.error('Error loading automation data:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'workflows', label: 'Workflow Automation', icon: Zap },
    { id: 'followup', label: 'Follow-up Rules', icon: Clock },
    { id: 'assignment', label: 'Auto-Assignment', icon: Users }
  ];

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-gray-200 rounded-lg h-40"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Automation Center</h1>
          <p className="text-gray-600 mt-2">Automate workflows, follow-ups, and lead assignments</p>
        </div>
        
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2">
          <Settings className="h-4 w-4" />
          <span>Settings</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <Activity className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Active Workflows</p>
              <p className="text-2xl font-bold text-gray-900">{workflows.filter(w => w.status === 'active').length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-green-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Total Conversions</p>
              <p className="text-2xl font-bold text-gray-900">{workflows.reduce((sum, w) => sum + w.conversions, 0)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <Bell className="h-8 w-8 text-yellow-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Follow-up Rules</p>
              <p className="text-2xl font-bold text-gray-900">{followUpRules.filter(r => r.status === 'active').length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-purple-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Assignment Rules</p>
              <p className="text-2xl font-bold text-gray-900">{assignmentRules.filter(r => r.status === 'active').length}</p>
            </div>
          </div>
        </div>
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
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {activeTab === 'workflows' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Workflow Automation</h2>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Create Workflow
              </button>
            </div>

            <div className="space-y-4">
              {workflows.map((workflow) => (
                <div key={workflow.id} className="p-6 hover:bg-gray-50 transition-colors border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-lg font-medium text-gray-900">{workflow.name}</h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          workflow.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {workflow.status}
                        </span>
                      </div>
                      <p className="text-gray-600 mt-1">{workflow.description}</p>
                      <div className="flex items-center space-x-6 mt-3 text-sm text-gray-500">
                        <span>Trigger: {workflow.trigger}</span>
                        <span>Actions: {workflow.actions}</span>
                        <span>Conversions: {workflow.conversions}</span>
                        <span>Last triggered: {workflow.lastTriggered}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button className="p-2 text-gray-400 hover:text-gray-600">
                        {workflow.status === 'active' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </button>
                      <button className="p-2 text-gray-400 hover:text-gray-600">
                        <Settings className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'followup' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Follow-up Rules</h2>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Create Rule
              </button>
            </div>

            <div className="space-y-4">
              {followUpRules.map((rule) => (
                <div key={rule.id} className="p-6 hover:bg-gray-50 transition-colors border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-lg font-medium text-gray-900">{rule.name}</h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          rule.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {rule.status}
                        </span>
                      </div>
                      <div className="mt-3 space-y-2">
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">When:</span> {rule.condition}
                        </p>
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Then:</span> {rule.action}
                        </p>
                        <p className="text-sm text-gray-500">
                          Triggered {rule.triggerCount} times
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button className="p-2 text-gray-400 hover:text-gray-600">
                        {rule.status === 'active' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </button>
                      <button className="p-2 text-gray-400 hover:text-gray-600">
                        <Settings className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'assignment' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Auto-Assignment Rules</h2>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Create Rule
              </button>
            </div>

            <div className="space-y-4">
              {assignmentRules.map((rule) => (
                <div key={rule.id} className="p-6 hover:bg-gray-50 transition-colors border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-lg font-medium text-gray-900">{rule.name}</h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          rule.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {rule.status}
                        </span>
                      </div>
                      <div className="mt-3 space-y-2">
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Criteria:</span> {rule.criteria}
                        </p>
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Assignment:</span> {rule.assignment}
                        </p>
                        <p className="text-sm text-gray-500">
                          {rule.assignmentCount} assignments made
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button className="p-2 text-gray-400 hover:text-gray-600">
                        {rule.status === 'active' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </button>
                      <button className="p-2 text-gray-400 hover:text-gray-600">
                        <Settings className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Automations;
