import React, { useState } from 'react';
import { 
  Settings as SettingsIcon, 
  Bell, 
  Shield, 
  Database, 
  Palette, 
  Globe, 
  Key,
  Mail,
  MessageSquare,
  Phone,
  Save,
  RefreshCw,
  Download,
  Upload
} from 'lucide-react';

const Settings: React.FC = () => {
  const [activeSection, setActiveSection] = useState('notifications');

  const sections = [
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'database', label: 'Database', icon: Database },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'integrations', label: 'Integrations', icon: Globe },
    { id: 'backup', label: 'Backup & Export', icon: Download }
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">DMHCA System Settings</h1>
        <p className="text-gray-600">Configure your CRM system preferences and settings</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <nav className="space-y-2">
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                      activeSection === section.id
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{section.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            {activeSection === 'notifications' && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Notification Settings</h2>
                
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Email Notifications</h3>
                    <div className="space-y-3">
                      {[
                        { id: 'new_lead', label: 'New lead assignments', checked: true },
                        { id: 'lead_updates', label: 'Lead status updates', checked: true },
                        { id: 'student_enrollment', label: 'Student enrollments', checked: false },
                        { id: 'payment_reminders', label: 'Payment reminders', checked: true },
                        { id: 'document_verification', label: 'Document verification requests', checked: false }
                      ].map((item) => (
                        <div key={item.id} className="flex items-center justify-between">
                          <label className="text-sm text-gray-700">{item.label}</label>
                          <button className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            item.checked ? 'bg-blue-600' : 'bg-gray-200'
                          }`}>
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              item.checked ? 'translate-x-6' : 'translate-x-1'
                            }`} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Push Notifications</h3>
                    <div className="space-y-3">
                      {[
                        { id: 'browser_notifications', label: 'Browser notifications', checked: true },
                        { id: 'mobile_notifications', label: 'Mobile app notifications', checked: false },
                        { id: 'desktop_notifications', label: 'Desktop notifications', checked: true }
                      ].map((item) => (
                        <div key={item.id} className="flex items-center justify-between">
                          <label className="text-sm text-gray-700">{item.label}</label>
                          <button className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            item.checked ? 'bg-blue-600' : 'bg-gray-200'
                          }`}>
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              item.checked ? 'translate-x-6' : 'translate-x-1'
                            }`} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'security' && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Security Settings</h2>
                
                <div className="space-y-6">
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-medium text-gray-900">Two-Factor Authentication</h3>
                        <p className="text-sm text-gray-500">Add an extra layer of security to your account</p>
                      </div>
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">Enabled</span>
                    </div>
                    <button className="text-blue-600 hover:text-blue-700 text-sm">Manage 2FA Settings</button>
                  </div>

                  <div className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-medium text-gray-900">Session Management</h3>
                        <p className="text-sm text-gray-500">Manage your active sessions</p>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center">
                        <span>Current Session (Chrome on Windows)</span>
                        <span className="text-green-600">Active</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Mobile Session (Safari on iOS)</span>
                        <button className="text-red-600 hover:text-red-700">Revoke</button>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border border-gray-200 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-2">Password Settings</h3>
                    <p className="text-sm text-gray-500 mb-3">Last changed 30 days ago</p>
                    <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm">
                      Change Password
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'database' && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Database Settings</h2>
                
                <div className="space-y-6">
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-2">Connection Status</h3>
                    <div className="flex items-center space-x-2 mb-3">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-gray-700">Connected to Supabase</span>
                    </div>
                    <p className="text-sm text-gray-500">Database: dmhca-crm-production</p>
                  </div>

                  <div className="p-4 border border-gray-200 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-2">Storage Usage</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Leads & Students</span>
                        <span>2.4 GB</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Documents</span>
                        <span>1.8 GB</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Communications</span>
                        <span>0.9 GB</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: '65%' }}></div>
                      </div>
                      <p className="text-xs text-gray-500">5.1 GB of 8 GB used</p>
                    </div>
                  </div>

                  <div className="p-4 border border-gray-200 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-2">Data Retention</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm text-gray-700 mb-1">Lead Data Retention</label>
                        <select className="w-full border border-gray-300 rounded px-3 py-1 text-sm">
                          <option>Keep indefinitely</option>
                          <option>Delete after 2 years</option>
                          <option>Delete after 5 years</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-700 mb-1">Communication Logs</label>
                        <select className="w-full border border-gray-300 rounded px-3 py-1 text-sm">
                          <option>Keep for 1 year</option>
                          <option>Keep for 2 years</option>
                          <option>Keep indefinitely</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'appearance' && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Appearance Settings</h2>
                
                <div className="space-y-6">
                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">Theme</h3>
                    <div className="grid grid-cols-3 gap-3">
                      {['Light', 'Dark', 'Auto'].map((theme) => (
                        <button
                          key={theme}
                          className={`p-3 border rounded-lg text-sm font-medium transition-colors ${
                            theme === 'Light' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          {theme}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">Color Scheme</h3>
                    <div className="flex space-x-3">
                      {[
                        { name: 'Blue', color: 'bg-blue-600' },
                        { name: 'Green', color: 'bg-green-600' },
                        { name: 'Purple', color: 'bg-purple-600' },
                        { name: 'Orange', color: 'bg-orange-600' }
                      ].map((scheme) => (
                        <button
                          key={scheme.name}
                          className={`w-8 h-8 rounded-full ${scheme.color} ${
                            scheme.name === 'Blue' ? 'ring-2 ring-offset-2 ring-blue-600' : ''
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">Display Options</h3>
                    <div className="space-y-3">
                      {[
                        { id: 'compact_mode', label: 'Compact mode', checked: false },
                        { id: 'show_animations', label: 'Show animations', checked: true },
                        { id: 'high_contrast', label: 'High contrast mode', checked: false }
                      ].map((item) => (
                        <div key={item.id} className="flex items-center justify-between">
                          <label className="text-sm text-gray-700">{item.label}</label>
                          <button className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            item.checked ? 'bg-blue-600' : 'bg-gray-200'
                          }`}>
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              item.checked ? 'translate-x-6' : 'translate-x-1'
                            }`} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'integrations' && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Integration Settings</h2>
                
                <div className="space-y-4">
                  {[
                    { name: 'WhatsApp Business API', status: 'Connected', icon: MessageSquare, color: 'text-green-600' },
                    { name: 'Email Service (SMTP)', status: 'Connected', icon: Mail, color: 'text-green-600' },
                    { name: 'Payment Gateway', status: 'Not Connected', icon: Key, color: 'text-gray-400' },
                    { name: 'Google Calendar', status: 'Connected', icon: Globe, color: 'text-green-600' }
                  ].map((integration) => {
                    const Icon = integration.icon;
                    return (
                      <div key={integration.name} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Icon className={`w-5 h-5 ${integration.color}`} />
                          <div>
                            <h3 className="font-medium text-gray-900">{integration.name}</h3>
                            <p className="text-sm text-gray-500">{integration.status}</p>
                          </div>
                        </div>
                        <button className="text-blue-600 hover:text-blue-700 text-sm">
                          {integration.status === 'Connected' ? 'Configure' : 'Connect'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeSection === 'backup' && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Backup & Export</h2>
                
                <div className="space-y-6">
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-2">Automated Backups</h3>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-gray-700">Daily backups</span>
                      <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-blue-600">
                        <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-6" />
                      </button>
                    </div>
                    <p className="text-sm text-gray-500">Last backup: Today at 3:00 AM</p>
                  </div>

                  <div className="p-4 border border-gray-200 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-2">Manual Backup</h3>
                    <p className="text-sm text-gray-500 mb-3">Create a backup of all your data</p>
                    <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center space-x-2">
                      <Download className="w-4 h-4" />
                      <span>Create Backup</span>
                    </button>
                  </div>

                  <div className="p-4 border border-gray-200 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-2">Data Export</h3>
                    <p className="text-sm text-gray-500 mb-3">Export your data in various formats</p>
                    <div className="space-y-2">
                      <button className="w-full text-left p-2 border border-gray-200 rounded hover:bg-gray-50 text-sm">
                        Export Leads (CSV)
                      </button>
                      <button className="w-full text-left p-2 border border-gray-200 rounded hover:bg-gray-50 text-sm">
                        Export Students (CSV)
                      </button>
                      <button className="w-full text-left p-2 border border-gray-200 rounded hover:bg-gray-50 text-sm">
                        Export Communications (JSON)
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Save Button */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="flex justify-end space-x-3">
                <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                  Reset to Default
                </button>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2">
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;