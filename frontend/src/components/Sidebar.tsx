import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  GraduationCap, 
  MessageSquare, 
  BarChart3, 
  FileText, 
  Settings,
  Stethoscope,
  Zap,
  Link,
  Inbox,
  User,
  Target,
  Activity,
  Download
} from 'lucide-react';

interface SidebarProps {
  activeSection: string;
  setActiveSection: (section: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeSection, setActiveSection }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'crm-pipeline', label: 'CRM Pipeline', icon: Target },
    { id: 'leads', label: 'Lead Management', icon: Users },
    { id: 'leads-monitoring', label: 'Lead Monitoring', icon: Activity },
    { id: 'inbox', label: 'Unified Inbox', icon: Inbox },
    { id: 'communications', label: 'Communications Hub', icon: MessageSquare },
    { id: 'students', label: 'Course Enrollments', icon: GraduationCap },
    { id: 'analytics', label: 'CRM Analytics', icon: BarChart3 },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'automations', label: 'Automations', icon: Zap },
    { id: 'integrations', label: 'Integrations', icon: Link },
    { id: 'data-export', label: 'Data Export', icon: Download },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'user-management', label: 'User Management', icon: Users },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <div className="w-64 bg-white shadow-lg border-r border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
            <Stethoscope className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">DMHCA CRM</h1>
            <p className="text-sm text-gray-500">Delhi Medical Healthcare</p>
          </div>
        </div>
      </div>
      
      <nav className="p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            
            return (
              <li key={item.id}>
                <button
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive 
                      ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600' 
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                  <span>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
};

export default Sidebar;