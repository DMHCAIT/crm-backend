import React, { useState } from 'react';
import ErrorBoundary from './components/ErrorBoundary';
import { NotificationProvider } from './components/NotificationSystem';
import AuthWrapper from './components/AuthWrapper';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import CRMPipeline from './components/CRMPipeline';
import LeadsManagement from './components/LeadsManagement';
import LeadsMonitoring from './components/LeadsMonitoring';
import MultiChannelInbox from './components/MultiChannelInbox';
import CommunicationsHub from './components/CommunicationsHub';
import StudentsManagement from './components/StudentsManagement';
import Analytics from './components/Analytics';
import Documents from './components/Documents';
import Automations from './components/Automations';
import Integrations from './components/Integrations';
import UserProfile from './components/UserProfile';
import UserManagement from './components/UserManagement';
import Settings from './components/Settings';
import DataExport from './components/DataExport';

const App: React.FC = () => {
  const [activeSection, setActiveSection] = useState('dashboard');

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'dashboard':
        return <Dashboard onNavigate={setActiveSection} />;
      case 'crm-pipeline':
        return <CRMPipeline />;
      case 'leads':
        return <LeadsManagement />;
      case 'leads-monitoring':
        return <LeadsMonitoring />;
      case 'inbox':
        return <MultiChannelInbox />;
      case 'communications':
        return <CommunicationsHub />;
      case 'students':
        return <StudentsManagement />;
      case 'analytics':
        return <Analytics />;
      case 'documents':
        return <Documents />;
      case 'automations':
        return <Automations />;
      case 'integrations':
        return <Integrations />;
      case 'real-time-integrations':
        return <Integrations />;
      case 'profile':
        return <UserProfile />;
      case 'user-management':
        return <UserManagement />;
      case 'settings':
        return <Settings />;
      case 'data-export':
        return <DataExport />;
      default:
        return <Dashboard onNavigate={setActiveSection} />;
    }
  };

  return (
    <ErrorBoundary>
      <NotificationProvider>
        <AuthWrapper>
          <div className="flex h-screen bg-gray-50">
            {/* Sidebar */}
            <Sidebar 
              activeSection={activeSection} 
              setActiveSection={setActiveSection} 
            />
            
            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <Header />
              
              {/* Page Content */}
              <main className="flex-1 overflow-y-auto">
                <div className="p-6">
                  {renderActiveSection()}
                </div>
              </main>
            </div>
          </div>
        </AuthWrapper>
      </NotificationProvider>
    </ErrorBoundary>
  );
};

export default App;
