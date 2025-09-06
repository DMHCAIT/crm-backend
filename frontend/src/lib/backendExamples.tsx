/**
 * CRM Backend Usage Examples
 * How to use the complete backend system in your components
 */

import { useEffect, useState } from 'react';
import { 
  initializeBackend,
  getRealTimeManager,
  getDatabaseManager,
  getAuthManager,
  getIntegrationManager,
  type RealTimeData,
  type DatabaseLead,
  type DatabaseStudent
} from './backend';

// ===========================
// EXAMPLE 1: BASIC SETUP
// ===========================

export const useBackend = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        await initializeBackend();
        setIsInitialized(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize backend');
      }
    };

    init();
  }, []);

  return { isInitialized, error };
};

// ===========================
// EXAMPLE 2: REAL-TIME DATA HOOK
// ===========================

export const useRealTimeData = () => {
  const [realTimeData, setRealTimeData] = useState<RealTimeData>({
    leads: 0,
    students: 0,
    communications: 0,
    lastUpdate: new Date(),
    activeConnections: 0
  });
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');

  useEffect(() => {
    const realTimeManager = getRealTimeManager({
      onDataUpdate: (data) => {
        setRealTimeData(data);
      },
      onLeadsUpdate: (payload) => {
        console.log('New lead update:', payload);
      },
      onStudentsUpdate: (payload) => {
        console.log('New student update:', payload);
      },
      onCommunicationsUpdate: (payload) => {
        console.log('New communication:', payload);
      },
      onError: (error) => {
        console.error('Real-time error:', error);
      }
    });

    const initRealTime = async () => {
      await realTimeManager.initialize();
      setConnectionStatus(realTimeManager.getConnectionStatus());
    };

    initRealTime();

    // Check connection status periodically
    const statusInterval = setInterval(() => {
      setConnectionStatus(realTimeManager.getConnectionStatus());
    }, 5000);

    return () => {
      clearInterval(statusInterval);
      realTimeManager.disconnect();
    };
  }, []);

  return { realTimeData, connectionStatus };
};

// ===========================
// EXAMPLE 3: LEADS MANAGEMENT
// ===========================

export const useLeadsManager = () => {
  const [leads, setLeads] = useState<DatabaseLead[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const databaseManager = getDatabaseManager();

  const loadLeads = async () => {
    setLoading(true);
    setError(null);
    try {
      const leadsData = await databaseManager.getLeads();
      setLeads(leadsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leads');
    } finally {
      setLoading(false);
    }
  };

  const createLead = async (leadData: Omit<DatabaseLead, 'id' | 'created_at' | 'updated_at'>) => {
    setLoading(true);
    try {
      const newLead = await databaseManager.createLead(leadData);
      setLeads(prev => [newLead, ...prev]);
      return newLead;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create lead');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateLead = async (id: string, updates: Partial<DatabaseLead>) => {
    setLoading(true);
    try {
      const updatedLead = await databaseManager.updateLead(id, updates);
      setLeads(prev => prev.map(lead => lead.id === id ? updatedLead : lead));
      return updatedLead;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update lead');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteLead = async (id: string) => {
    setLoading(true);
    try {
      await databaseManager.deleteLead(id);
      setLeads(prev => prev.filter(lead => lead.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete lead');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeads();
  }, []);

  return {
    leads,
    loading,
    error,
    loadLeads,
    createLead,
    updateLead,
    deleteLead
  };
};

// ===========================
// EXAMPLE 4: AUTHENTICATION
// ===========================

export const useAuth = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const authManager = getAuthManager();

  useEffect(() => {
    // Check current user
    const checkUser = async () => {
      try {
        const currentUser = await authManager.getCurrentUser();
        setUser(currentUser);
      } catch (err) {
        console.log('No user session found');
      } finally {
        setLoading(false);
      }
    };

    checkUser();

    // Listen for auth changes
    const { data: { subscription } } = authManager.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await authManager.signIn(email, password);
      setUser(result.user);
      return result;
    } catch (err) {
      let errorMessage = 'Sign in failed';
      
      if (err instanceof Error) {
        if (err.message.includes('Invalid login credentials')) {
          errorMessage = 'Invalid email or password. Please check your credentials.';
        } else if (err.message.includes('Database error')) {
          errorMessage = 'Database connection error. Try the Demo Login button above.';
        } else if (err.message.includes('Auth session missing')) {
          errorMessage = 'Authentication session error. Please try again.';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await authManager.signUp(email, password);
      if (result.user) {
        setUser(result.user);
      }
      return result;
    } catch (err) {
      let errorMessage = 'Sign up failed';
      
      if (err instanceof Error) {
        if (err.message.includes('User already registered')) {
          errorMessage = 'An account with this email already exists. Try signing in instead.';
        } else if (err.message.includes('Password should be at least')) {
          errorMessage = 'Password should be at least 6 characters long.';
        } else if (err.message.includes('Invalid email')) {
          errorMessage = 'Please enter a valid email address.';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await authManager.signOut();
      setUser(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign out failed');
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    isAuthenticated: !!user
  };
};

// ===========================
// EXAMPLE 5: INTEGRATIONS
// ===========================

export const useIntegrations = () => {
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const databaseManager = getDatabaseManager();
  const integrationManager = getIntegrationManager();

  const loadIntegrations = async () => {
    setLoading(true);
    try {
      const data = await databaseManager.getIntegrationStatus();
      setIntegrations(data);
    } catch (err) {
      console.error('Failed to load integrations:', err);
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async (integrationName: string) => {
    try {
      const success = await integrationManager.testConnection(integrationName);
      await loadIntegrations(); // Refresh status
      return success;
    } catch (err) {
      console.error(`Failed to test ${integrationName}:`, err);
      return false;
    }
  };

  const syncIntegration = async (integrationName: string) => {
    try {
      await integrationManager.syncIntegration(integrationName);
      await loadIntegrations(); // Refresh status
    } catch (err) {
      console.error(`Failed to sync ${integrationName}:`, err);
      throw err;
    }
  };

  const disconnectIntegration = async (integrationName: string) => {
    try {
      await integrationManager.disconnectIntegration(integrationName);
      await loadIntegrations(); // Refresh status
    } catch (err) {
      console.error(`Failed to disconnect ${integrationName}:`, err);
      throw err;
    }
  };

  useEffect(() => {
    loadIntegrations();
  }, []);

  return {
    integrations,
    loading,
    loadIntegrations,
    testConnection,
    syncIntegration,
    disconnectIntegration
  };
};

// ===========================
// EXAMPLE 6: COMPLETE COMPONENT
// ===========================

export const CRMBackendExample = () => {
  const { isInitialized, error: backendError } = useBackend();
  const { realTimeData, connectionStatus } = useRealTimeData();
  const { user, signIn, signOut, isAuthenticated } = useAuth();
  const { leads, createLead } = useLeadsManager();
  const { integrations, testConnection } = useIntegrations();

  if (!isInitialized) {
    return <div>Initializing backend...</div>;
  }

  if (backendError) {
    return <div>Backend Error: {backendError}</div>;
  }

  if (!isAuthenticated) {
    return (
      <div>
        <h2>Please Sign In</h2>
        <button onClick={() => signIn('demo@crm.com', 'demo123456')}>
          Demo Sign In
        </button>
      </div>
    );
  }

  const handleCreateLead = async () => {
    try {
      await createLead({
        name: 'Test Lead',
        email: 'test@example.com',
        source: 'manual',
        status: 'new',
        score: 50
      });
    } catch (err) {
      console.error('Failed to create lead:', err);
    }
  };

  return (
    <div>
      <h1>CRM Backend Demo</h1>
      
      <div>
        <h2>User Info</h2>
        <p>Email: {user?.email}</p>
        <button onClick={signOut}>Sign Out</button>
      </div>

      <div>
        <h2>Real-Time Status</h2>
        <p>Connection: {connectionStatus}</p>
        <p>Leads: {realTimeData.leads}</p>
        <p>Students: {realTimeData.students}</p>
        <p>Last Update: {realTimeData.lastUpdate.toLocaleTimeString()}</p>
      </div>

      <div>
        <h2>Leads ({leads.length})</h2>
        <button onClick={handleCreateLead}>Create Test Lead</button>
        <ul>
          {leads.slice(0, 5).map(lead => (
            <li key={lead.id}>
              {lead.name} - {lead.status} ({lead.score})
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h2>Integrations</h2>
        {integrations.map(integration => (
          <div key={integration.id}>
            <span>{integration.integration_name}: {integration.status}</span>
            <button onClick={() => testConnection(integration.integration_name)}>
              Test
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default {
  useBackend,
  useRealTimeData,
  useLeadsManager,
  useAuth,
  useIntegrations,
  CRMBackendExample
};
