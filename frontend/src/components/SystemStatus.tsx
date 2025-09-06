import React, { useState, useEffect } from 'react';
import backend from '../lib/backend';

interface StatusItem {
  name: string;
  status: 'checking' | 'success' | 'error';
  message: string;
  details?: string;
}

const SystemStatus: React.FC = () => {
  const [status, setStatus] = useState<StatusItem[]>([
    { name: 'Frontend Build', status: 'success', message: 'Running on Vercel' },
    { name: 'Backend API', status: 'checking', message: 'Testing connection...' },
    { name: 'Database Connection', status: 'checking', message: 'Verifying Supabase...' },
    { name: 'Authentication System', status: 'checking', message: 'Checking auth setup...' },
  ]);

  useEffect(() => {
    const checkSystems = async () => {
      // Check Backend API
      try {
        const response = await fetch('https://crm-backend-production-5e32.up.railway.app/api/health');
        if (response.ok) {
          setStatus(prev => prev.map(item => 
            item.name === 'Backend API' 
              ? { ...item, status: 'success', message: 'Connected to Railway' }
              : item
          ));
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (error) {
        setStatus(prev => prev.map(item => 
          item.name === 'Backend API' 
            ? { ...item, status: 'error', message: 'Connection failed', details: error instanceof Error ? error.message : 'Unknown error' }
            : item
        ));
      }

      // Check Database
      try {
        const dbManager = backend.getDatabaseManager();
        await dbManager.getLeads(); // Test database connection
        setStatus(prev => prev.map(item => 
          item.name === 'Database Connection' 
            ? { ...item, status: 'success', message: 'Supabase connected' }
            : item
        ));
      } catch (error) {
        setStatus(prev => prev.map(item => 
          item.name === 'Database Connection' 
            ? { ...item, status: 'error', message: 'Database error', details: error instanceof Error ? error.message : 'Unknown error' }
            : item
        ));
      }

      // Check Authentication
      try {
        const authManager = backend.getAuthManager();
        const isConfigured = authManager !== null;
        setStatus(prev => prev.map(item => 
          item.name === 'Authentication System' 
            ? { ...item, status: isConfigured ? 'success' : 'error', message: isConfigured ? 'Auth system ready' : 'Auth not configured' }
            : item
        ));
      } catch (error) {
        setStatus(prev => prev.map(item => 
          item.name === 'Authentication System' 
            ? { ...item, status: 'error', message: 'Auth system error', details: error instanceof Error ? error.message : 'Unknown error' }
            : item
        ));
      }
    };

    checkSystems();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'checking': return '⏳';
      default: return '❓';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-50';
      case 'error': return 'text-red-600 bg-red-50';
      case 'checking': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">🔧 System Status</h3>
      
      <div className="space-y-3">
        {status.map((item, index) => (
          <div key={index} className={`p-3 rounded-lg border ${getStatusColor(item.status)}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-lg">{getStatusIcon(item.status)}</span>
                <div>
                  <h4 className="font-medium">{item.name}</h4>
                  <p className="text-sm opacity-75">{item.message}</p>
                  {item.details && (
                    <p className="text-xs opacity-60 mt-1">Details: {item.details}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h4 className="font-medium text-blue-900 mb-2">📋 Next Steps</h4>
        <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
          <li>Run the <code className="bg-blue-100 px-1 rounded text-xs">complete-auth-setup.sql</code> script in Supabase SQL Editor</li>
          <li>Test login with: <code className="bg-blue-100 px-1 rounded text-xs">admin@dmhca.com</code> / <code className="bg-blue-100 px-1 rounded text-xs">Admin123456!</code></li>
          <li>Or use: <code className="bg-blue-100 px-1 rounded text-xs">test@dmhca.com</code> / <code className="bg-blue-100 px-1 rounded text-xs">Test123456!</code></li>
          <li>Use Demo Login if auth setup is not complete</li>
        </ol>
      </div>

      <div className="mt-4 text-xs text-gray-500 space-y-1">
        <p><strong>Frontend:</strong> www.crmdmhca.com (Vercel)</p>
        <p><strong>Backend:</strong> crm-backend-production-5e32.up.railway.app (Railway)</p>
        <p><strong>Database:</strong> cyzbdpsfquetmftlaswk.supabase.co (Supabase)</p>
      </div>
    </div>
  );
};

export default SystemStatus;
