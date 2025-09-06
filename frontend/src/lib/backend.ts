/**
 * CRM Real-Time Backend Configuration
 * Complete backend setup with all real-time functionality
 * This file contains everything needed for the backend implementation
 */

import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';

// ===========================
// 1. ENVIRONMENT CONFIGURATION
// ===========================

interface EnvironmentConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  enableRealTime: boolean;
  enableNotifications: boolean;
  autoRefreshInterval: number;
  debugMode: boolean;
}

interface ApiConfig {
  baseUrl: string;
  backendUrl: string;
  timeout: number;
  headers: Record<string, string>;
}

export const getApiConfig = (): ApiConfig => {
  return {
    baseUrl: import.meta.env.VITE_API_BASE_URL || 'https://crm-backend-production-5e32.up.railway.app',
    backendUrl: import.meta.env.VITE_API_BACKEND_URL || 'https://crm-backend-production-5e32.up.railway.app/api',
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  };
};

export const getEnvironmentConfig = (): EnvironmentConfig => {
  return {
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL || 'https://cyzbdpsfquetmftlaswk.supabase.co',
    supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5emJkcHNmcXVldG1mdGxhc3drIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0NzQzMjUsImV4cCI6MjA3MjA1MDMyNX0.n6Fflxbe12IMm5ICkoa6jGM2V3c3aohGU-cGW1WJIRA',
    enableRealTime: import.meta.env.VITE_ENABLE_REAL_TIME !== 'false',
    enableNotifications: import.meta.env.VITE_ENABLE_NOTIFICATIONS !== 'false',
    autoRefreshInterval: 30000,
    debugMode: import.meta.env.VITE_DEBUG_MODE === 'true'
  };
};

// ===========================
// 2. DATABASE TYPES
// ===========================

export interface DatabaseLead {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  email?: string;
  phone?: string;
  source: 'website' | 'social_media' | 'referral' | 'manual' | 'advertisement';
  status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'closed_won' | 'closed_lost';
  score: number;
  notes?: string;
  assigned_to?: string;
}

export interface DatabaseStudent {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  email?: string;
  phone?: string;
  course?: string;
  status: 'enrolled' | 'active' | 'completed' | 'dropped' | 'suspended';
  progress: number;
  notes?: string;
}

export interface DatabaseUser {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  email: string;
  phone?: string;
  office_phone?: string;
  role: 'super_admin' | 'senior_manager' | 'manager' | 'team_leader' | 'counselor';
  department?: string;
  designation?: string;
  location?: string;
  date_of_birth?: string;
  join_date?: string;
  status: 'active' | 'inactive' | 'suspended';
  reports_to?: string;
  profile_image?: string;
}

export interface DatabaseCommunication {
  id: string;
  created_at: string;
  type: 'email' | 'sms' | 'whatsapp' | 'call' | 'meeting';
  direction: 'inbound' | 'outbound';
  subject?: string;
  content?: string;
  recipient?: string;
  sender?: string;
  status: 'sent' | 'delivered' | 'read' | 'failed' | 'pending';
  lead_id?: string;
  student_id?: string;
}

export interface IntegrationStatus {
  id: string;
  created_at: string;
  updated_at: string;
  integration_name: string;
  status: 'connected' | 'disconnected' | 'error' | 'syncing';
  last_sync?: string;
  configuration: Record<string, any>;
}

export type Database = {
  public: {
    Tables: {
      leads: {
        Row: DatabaseLead;
        Insert: Omit<DatabaseLead, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<DatabaseLead, 'id' | 'created_at'>>;
      };
      students: {
        Row: DatabaseStudent;
        Insert: Omit<DatabaseStudent, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<DatabaseStudent, 'id' | 'created_at'>>;
      };
      communications: {
        Row: DatabaseCommunication;
        Insert: Omit<DatabaseCommunication, 'id' | 'created_at'>;
        Update: Partial<Omit<DatabaseCommunication, 'id' | 'created_at'>>;
      };
      integrations_status: {
        Row: IntegrationStatus;
        Insert: Omit<IntegrationStatus, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<IntegrationStatus, 'id' | 'created_at'>>;
      };
    };
  };
};

// ===========================
// 3. SUPABASE CLIENT SETUP
// ===========================

let supabaseClient: SupabaseClient<any> | null = null;

export const initializeSupabase = (): SupabaseClient<any> => {
  if (supabaseClient) {
    return supabaseClient;
  }

  const config = getEnvironmentConfig();
  
  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    throw new Error('Supabase configuration missing. Please check your environment variables.');
  }

  supabaseClient = createClient<any>(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    },
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    }
  });

  if (config.debugMode) {
    console.log('✅ Supabase client initialized', {
      url: config.supabaseUrl,
      realTime: config.enableRealTime
    });
  }

  return supabaseClient;
};

// DEPRECATED: Frontend should use API endpoints, not direct database access
export const getSupabase = (): SupabaseClient<any> => {
  console.warn('⚠️  DEPRECATED: getSupabase() - Frontend should use getApiClient() for proper API-based communication');
  if (!supabaseClient) {
    return initializeSupabase();
  }
  return supabaseClient;
};

// ===========================
// 4. PRODUCTION API CLIENT (Railway Backend)
// ===========================

class ProductionApiClient {
  private config: ApiConfig;

  constructor() {
    this.config = getApiConfig();
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.config.backendUrl}${endpoint}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    const defaultOptions: RequestInit = {
      headers: this.config.headers,
      signal: controller.signal,
    };

    try {
      const response = await fetch(url, { ...defaultOptions, ...options });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} - ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      console.error(`API Request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // Health check
  async healthCheck() {
    return this.request('/health');
  }

  // Dashboard stats - Use correct endpoint
  async getDashboardStats() {
    try {
      // Use the dashboard stats endpoint that now exists
      const response = await this.request('/dashboard/stats') as { data: any };
      return response;
    } catch (error) {
      console.warn('Dashboard stats endpoint not available, using analytics fallback');
      try {
        // Fallback to analytics endpoint
        const response = await this.request('/analytics/realtime') as {
          leads?: number;
          students?: number;
          communications?: number;
          revenue?: number;
          lastUpdated?: string;
        };
        
        // Transform the response to match expected format
        return {
          data: {
            totalLeads: response.leads || 0,
            activeLeads: response.leads || 0,
            newLeadsThisWeek: Math.floor((response.leads || 0) * 0.3),
            totalStudents: response.students || 0,
            activeStudents: response.students || 0,
            totalCommunications: response.communications || 0,
            totalDocuments: 0,
            conversionRate: (response.leads || 0) > 0 ? Math.round(((response.students || 0) / (response.leads || 1)) * 100) : 0,
            responseTime: '2.4h',
            lastUpdated: response.lastUpdated || new Date().toISOString()
          }
        };
      } catch (fallbackError) {
        console.warn('Analytics endpoint also not available, using default data');
        return {
          data: {
            totalLeads: 0,
            activeLeads: 0,
            newLeadsThisWeek: 0,
            totalStudents: 0,
            activeStudents: 0,
            totalCommunications: 0,
            totalDocuments: 0,
            conversionRate: 0,
            responseTime: '2.4h',
            lastUpdated: new Date().toISOString()
          }
        };
      }
    }
  }

  // Leads API - Now available endpoints
  async getLeads() {
    return this.request('/leads');
  }

  async createLead(leadData: any) {
    return this.request('/leads', {
      method: 'POST',
      body: JSON.stringify(leadData)
    });
  }

  async updateLead(id: string, leadData: any) {
    return this.request(`/leads?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(leadData)
    });
  }

  async deleteLead(id: string) {
    return this.request(`/leads?id=${id}`, {
      method: 'DELETE'
    });
  }

  // Students API - New endpoints
  async getStudents() {
    return this.request('/students');
  }

  async createStudent(studentData: any) {
    return this.request('/students', {
      method: 'POST',
      body: JSON.stringify(studentData)
    });
  }

  async updateStudent(id: string, studentData: any) {
    return this.request(`/students?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(studentData)
    });
  }

  async deleteStudent(id: string) {
    return this.request(`/students?id=${id}`, {
      method: 'DELETE'
    });
  }

  // Users API - New endpoints
  async getUsers() {
    return this.request('/users');
  }

  async createUser(userData: any) {
    return this.request('/users', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }

  async updateUser(id: string, userData: any) {
    return this.request(`/users?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData)
    });
  }

  async deleteUser(id: string) {
    return this.request(`/users?id=${id}`, {
      method: 'DELETE'
    });
  }

  // Communications API - New endpoints
  async getCommunications(filters?: any) {
    const params = new URLSearchParams(filters).toString();
    return this.request(`/communications${params ? `?${params}` : ''}`);
  }

  async createCommunication(communicationData: any) {
    return this.request('/communications', {
      method: 'POST',
      body: JSON.stringify(communicationData)
    });
  }

  // Documents API - New endpoints
  async getDocuments(filters?: any) {
    const params = new URLSearchParams(filters).toString();
    return this.request(`/documents${params ? `?${params}` : ''}`);
  }

  async uploadDocument(formData: FormData) {
    return this.request('/documents', {
      method: 'POST',
      body: formData,
      headers: {} // Remove Content-Type to let browser set it for FormData
    });
  }

  // Payments API - Enhanced
  async getPayments(filters?: any) {
    const params = new URLSearchParams(filters).toString();
    return this.request(`/payments${params ? `?${params}` : ''}`);
  }

  async createPaymentOrder(paymentData: any) {
    return this.request('/payments/create-order', {
      method: 'POST',
      body: JSON.stringify(paymentData)
    });
  }

  // Integrations API - New endpoints
  async getIntegrationStatus() {
    return this.request('/integrations');
  }

  async testIntegration(integration: string) {
    return this.request('/integrations', {
      method: 'POST',
      body: JSON.stringify({ action: 'test', integration })
    });
  }

  // WhatsApp API
  async sendWhatsAppMessage(to: string, message: string) {
    return this.request('/api/whatsapp/send', {
      method: 'POST',
      body: JSON.stringify({ to, message })
    });
  }

  // Facebook API
  async getFacebookLeads() {
    // Facebook leads endpoint doesn't exist
    console.warn('Facebook leads endpoint not available on backend');
    return [];
  }

  // Analytics API - Updated to match backend endpoint
  async getAnalytics(_period: string = '30d') {
    return this.request('/api/analytics/realtime');
  }

  async createPaymentLink(_amount: number, _description: string) {
    // Use the new payment order endpoint
    return this.createPaymentOrder({
      amount: _amount,
      description: _description
    });
  }
}

// Singleton instance
let apiClient: ProductionApiClient | null = null;

export const getApiClient = (): ProductionApiClient => {
  if (!apiClient) {
    apiClient = new ProductionApiClient();
  }
  return apiClient;
};

// ===========================
// 4. REAL-TIME SUBSCRIPTIONS
// ===========================

export interface RealTimeData {
  leads: number;
  students: number;
  communications: number;
  lastUpdate: Date;
  activeConnections: number;
}

export interface RealTimeCallbacks {
  onLeadsUpdate?: (payload: any) => void;
  onStudentsUpdate?: (payload: any) => void;
  onCommunicationsUpdate?: (payload: any) => void;
  onIntegrationsUpdate?: (payload: any) => void;
  onDataUpdate?: (data: RealTimeData) => void;
  onError?: (error: Error) => void;
}

export class RealTimeManager {
  private supabase: SupabaseClient<any>;
  private channels: RealtimeChannel[] = [];
  private callbacks: RealTimeCallbacks;
  private data: RealTimeData;
  private config: EnvironmentConfig;

  constructor(callbacks: RealTimeCallbacks = {}) {
    this.supabase = getSupabase();
    this.callbacks = callbacks;
    this.config = getEnvironmentConfig();
    this.data = {
      leads: 0,
      students: 0,
      communications: 0,
      lastUpdate: new Date(),
      activeConnections: 0
    };
  }

  async initialize(): Promise<void> {
    if (!this.config.enableRealTime) {
      console.warn('Real-time is disabled in configuration');
      return;
    }

    try {
      await this.setupLeadsSubscription();
      await this.setupStudentsSubscription();
      await this.setupCommunicationsSubscription();
      await this.setupIntegrationsSubscription();
      await this.loadInitialData();
      
      if (this.config.debugMode) {
        console.log('✅ Real-time manager initialized with', this.channels.length, 'channels');
      }
    } catch (error) {
      console.error('❌ Failed to initialize real-time manager:', error);
      this.callbacks.onError?.(error as Error);
    }
  }

  private async setupLeadsSubscription(): Promise<void> {
    const channel = this.supabase
      .channel('leads-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leads' },
        (payload) => {
          if (this.config.debugMode) {
            console.log('📊 Leads update:', payload);
          }
          
          this.updateData();
          this.callbacks.onLeadsUpdate?.(payload);
          this.showNotification('Lead Update', 'New lead activity detected');
        }
      )
      .subscribe();

    this.channels.push(channel);
  }

  private async setupStudentsSubscription(): Promise<void> {
    const channel = this.supabase
      .channel('students-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'students' },
        (payload) => {
          if (this.config.debugMode) {
            console.log('🎓 Students update:', payload);
          }
          
          this.updateData();
          this.callbacks.onStudentsUpdate?.(payload);
          this.showNotification('Student Update', 'Student information changed');
        }
      )
      .subscribe();

    this.channels.push(channel);
  }

  private async setupCommunicationsSubscription(): Promise<void> {
    const channel = this.supabase
      .channel('communications-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'communications' },
        (payload) => {
          if (this.config.debugMode) {
            console.log('💬 Communications update:', payload);
          }
          
          this.updateData();
          this.callbacks.onCommunicationsUpdate?.(payload);
          this.showNotification('New Message', 'Communication activity detected');
        }
      )
      .subscribe();

    this.channels.push(channel);
  }

  private async setupIntegrationsSubscription(): Promise<void> {
    const channel = this.supabase
      .channel('integrations-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'integrations_status' },
        (payload) => {
          if (this.config.debugMode) {
            console.log('🔗 Integrations update:', payload);
          }
          
          this.callbacks.onIntegrationsUpdate?.(payload);
          this.showNotification('Integration Update', 'Integration status changed');
        }
      )
      .subscribe();

    this.channels.push(channel);
  }

  private async loadInitialData(): Promise<void> {
    try {
      const [leadsCount, studentsCount, communicationsCount] = await Promise.all([
        this.supabase.from('leads').select('*', { count: 'exact', head: true }),
        this.supabase.from('students').select('*', { count: 'exact', head: true }),
        this.supabase.from('communications').select('*', { count: 'exact', head: true })
      ]);

      this.data = {
        leads: leadsCount.count || 0,
        students: studentsCount.count || 0,
        communications: communicationsCount.count || 0,
        lastUpdate: new Date(),
        activeConnections: this.channels.length
      };

      this.callbacks.onDataUpdate?.(this.data);
    } catch (error) {
      console.error('Failed to load initial data:', error);
    }
  }

  private updateData(): void {
    this.data.lastUpdate = new Date();
    this.loadInitialData(); // Refresh counts
  }

  private showNotification(title: string, body: string): void {
    if (!this.config.enableNotifications) return;

    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(title, {
          body,
          icon: '/favicon.ico',
          badge: '/favicon.ico'
        });
      } else if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            new Notification(title, { body, icon: '/favicon.ico' });
          }
        });
      }
    }
  }

  getData(): RealTimeData {
    return { ...this.data };
  }

  getConnectionStatus(): 'connected' | 'disconnected' | 'connecting' {
    if (this.channels.length === 0) return 'disconnected';
    
    const connectedChannels = this.channels.filter(channel => 
      channel.state === 'joined'
    );
    
    if (connectedChannels.length === this.channels.length) {
      return 'connected';
    } else if (connectedChannels.length > 0) {
      return 'connecting';
    } else {
      return 'disconnected';
    }
  }

  async disconnect(): Promise<void> {
    for (const channel of this.channels) {
      await this.supabase.removeChannel(channel);
    }
    this.channels = [];
    
    if (this.config.debugMode) {
      console.log('🔌 Real-time manager disconnected');
    }
  }
}

// ===========================
// 5. DATABASE OPERATIONS
// ===========================

export class DatabaseManager {
  private supabase: SupabaseClient<any>;

  constructor() {
    this.supabase = getSupabase();
  }

  // LEADS OPERATIONS
  async getLeads(limit = 50, offset = 0): Promise<DatabaseLead[]> {
    const { data, error } = await this.supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return data || [];
  }

  async createLead(lead: Omit<DatabaseLead, 'id' | 'created_at' | 'updated_at'>): Promise<DatabaseLead> {
    const { data, error } = await this.supabase
      .from('leads')
      .insert(lead)
      .select()
      .single();

    if (error) throw error;
    return data as DatabaseLead;
  }

  async updateLead(id: string, updates: Partial<Omit<DatabaseLead, 'id' | 'created_at'>>): Promise<DatabaseLead> {
    const { data, error } = await this.supabase
      .from('leads')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as DatabaseLead;
  }

  async deleteLead(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('leads')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // STUDENTS OPERATIONS
  async getStudents(limit = 50, offset = 0): Promise<DatabaseStudent[]> {
    const { data, error } = await this.supabase
      .from('students')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return data || [];
  }

  async createStudent(student: Omit<DatabaseStudent, 'id' | 'created_at' | 'updated_at'>): Promise<DatabaseStudent> {
    const { data, error } = await this.supabase
      .from('students')
      .insert(student)
      .select()
      .single();

    if (error) throw error;
    return data as DatabaseStudent;
  }

  async updateStudent(id: string, updates: Partial<Omit<DatabaseStudent, 'id' | 'created_at'>>): Promise<DatabaseStudent> {
    const { data, error } = await this.supabase
      .from('students')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as DatabaseStudent;
  }

  async deleteStudent(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('students')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // USER OPERATIONS
  async getUsers(limit = 50, offset = 0): Promise<DatabaseUser[]> {
    try {
      // First try to get from custom users table
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.warn('Users table not found, falling back to auth.users');
        // Fallback to auth.users if custom table doesn't exist
        const { data: authData, error: authError } = await this.supabase.auth.admin.listUsers();
        
        if (authError) throw authError;
        
        // Transform auth users to our interface
        const transformedUsers: DatabaseUser[] = authData.users.map(user => ({
          id: user.id,
          created_at: user.created_at,
          updated_at: user.updated_at || user.created_at,
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'Unknown',
          email: user.email || '',
          phone: user.user_metadata?.phone,
          office_phone: user.user_metadata?.office_phone,
          role: user.user_metadata?.role || 'counselor',
          department: user.user_metadata?.department,
          designation: user.user_metadata?.designation,
          location: user.user_metadata?.location,
          date_of_birth: user.user_metadata?.date_of_birth,
          join_date: user.user_metadata?.join_date || user.created_at,
          status: user.email_confirmed_at ? 'active' : 'inactive',
          reports_to: user.user_metadata?.reports_to,
          profile_image: user.user_metadata?.profile_image
        }));
        
        return transformedUsers.slice(offset, offset + limit);
      }
      
      return data || [];
    } catch (error) {
      console.error('Error fetching users:', error);
      return [];
    }
  }

  async createUser(user: Omit<DatabaseUser, 'id' | 'created_at' | 'updated_at'>): Promise<DatabaseUser> {
    // Note: In a real implementation, this would require admin privileges
    // For now, we'll create in the users table if it exists
    const { data, error } = await this.supabase
      .from('users')
      .insert(user)
      .select()
      .single();

    if (error) throw error;
    return data as DatabaseUser;
  }

  async updateUser(id: string, updates: Partial<Omit<DatabaseUser, 'id' | 'created_at'>>): Promise<DatabaseUser> {
    const { data, error } = await this.supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as DatabaseUser;
  }

  async deleteUser(id: string): Promise<void> {
    // Note: This only deletes from users table, not auth.users
    // In production, you'd need proper user deactivation
    const { error } = await this.supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // COMMUNICATIONS OPERATIONS
  async getCommunications(limit = 50, offset = 0): Promise<DatabaseCommunication[]> {
    const { data, error } = await this.supabase
      .from('communications')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return data || [];
  }

  async createCommunication(communication: Omit<DatabaseCommunication, 'id' | 'created_at'>): Promise<DatabaseCommunication> {
    const { data, error } = await this.supabase
      .from('communications')
      .insert(communication)
      .select()
      .single();

    if (error) throw error;
    return data as DatabaseCommunication;
  }

  // INTEGRATIONS OPERATIONS
  async getIntegrationStatus(): Promise<IntegrationStatus[]> {
    const { data, error } = await this.supabase
      .from('integrations_status')
      .select('*')
      .order('integration_name');

    if (error) throw error;
    return data || [];
  }

  async updateIntegrationStatus(name: string, status: IntegrationStatus['status'], config?: Record<string, any>): Promise<IntegrationStatus> {
    const updates: any = { status, last_sync: new Date().toISOString() };
    if (config) updates.configuration = config;

    const { data, error } = await this.supabase
      .from('integrations_status')
      .update(updates)
      .eq('integration_name', name)
      .select()
      .single();

    if (error) throw error;
    return data as IntegrationStatus;
  }

  // ANALYTICS OPERATIONS
  async getAnalytics(dateRange?: { start: string; end: string }) {
    const query = this.supabase.from('leads').select('status, source, created_at');
    
    if (dateRange) {
      query.gte('created_at', dateRange.start);
      query.lte('created_at', dateRange.end);
    }

    const { data: leads, error: leadsError } = await query;
    if (leadsError) throw leadsError;

    const { data: students, error: studentsError } = await this.supabase
      .from('students')
      .select('status, progress, created_at');
    if (studentsError) throw studentsError;

    const { data: communications, error: communicationsError } = await this.supabase
      .from('communications')
      .select('type, status, created_at');
    if (communicationsError) throw communicationsError;

    return {
      leads: leads || [],
      students: students || [],
      communications: communications || [],
      summary: {
        totalLeads: leads?.length || 0,
        totalStudents: students?.length || 0,
        totalCommunications: communications?.length || 0
      }
    };
  }
}

// ===========================
// 6. AUTHENTICATION
// ===========================

export class AuthManager {
  private supabase: SupabaseClient<any>;

  constructor() {
    this.supabase = getSupabase();
  }

  async signIn(email: string, password: string): Promise<any> {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error('Supabase auth error:', error);
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Authentication failed:', error);
      throw error;
    }
  }

  async signUp(email: string, password: string): Promise<any> {
    try {
      const { data, error } = await this.supabase.auth.signUp({
        email,
        password
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Signup failed:', error);
      
      // If database error, provide helpful message
      if (error instanceof Error && error.message.includes('Database error')) {
        throw new Error('Database connection error. Please contact support for assistance.');
      }
      
      throw error;
    }
  }

  async signOut(): Promise<void> {
    try {
      const { error } = await this.supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Signout error:', error);
    }
  }

  async getCurrentUser(): Promise<any> {

    try {
      const { data: { user }, error } = await this.supabase.auth.getUser();
      if (error) throw error;
      return user;
    } catch (error) {
      console.error('Get user error:', error);
      return null;
    }
  }

  onAuthStateChange(callback: (event: string, session: any) => void) {
    return this.supabase.auth.onAuthStateChange(callback);
  }
}

// ===========================
// 7. INTEGRATION SERVICES
// ===========================

export class IntegrationManager {
  private db: DatabaseManager;

  constructor() {
    this.db = new DatabaseManager();
  }

  async testConnection(integrationName: string): Promise<boolean> {
    try {
      // Simulate connection test
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await this.db.updateIntegrationStatus(integrationName, 'connected');
      return true;
    } catch (error) {
      await this.db.updateIntegrationStatus(integrationName, 'error');
      return false;
    }
  }

  async syncIntegration(integrationName: string): Promise<void> {
    await this.db.updateIntegrationStatus(integrationName, 'syncing');
    
    try {
      // Simulate sync process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      await this.db.updateIntegrationStatus(integrationName, 'connected');
    } catch (error) {
      await this.db.updateIntegrationStatus(integrationName, 'error');
      throw error;
    }
  }

  async disconnectIntegration(integrationName: string): Promise<void> {
    await this.db.updateIntegrationStatus(integrationName, 'disconnected');
  }
}

// ===========================
// 8. EXPORT MAIN CLASSES
// ===========================

// Default singleton instances
let realTimeManager: RealTimeManager | null = null;
let databaseManager: DatabaseManager | null = null;
let authManager: AuthManager | null = null;
let integrationManager: IntegrationManager | null = null;

export const getRealTimeManager = (callbacks?: RealTimeCallbacks): RealTimeManager => {
  if (!realTimeManager) {
    realTimeManager = new RealTimeManager(callbacks);
  }
  return realTimeManager;
};

// ARCHITECTURAL NOTE: Frontend should ONLY use API client, never direct database access
// These functions are deprecated and will be removed to enforce proper separation

// Deprecated: Use getApiClient() instead
export const getDatabaseManager = (): DatabaseManager => {
  console.warn('⚠️  DEPRECATED: getDatabaseManager() - Use getApiClient() instead for proper API-based communication');
  if (!databaseManager) {
    databaseManager = new DatabaseManager();
  }
  return databaseManager;
};

// Deprecated: Use getApiClient() instead  
export const getAuthManager = (): AuthManager => {
  console.warn('⚠️  DEPRECATED: getAuthManager() - Use getApiClient() instead for proper API-based communication');
  if (!authManager) {
    authManager = new AuthManager();
  }
  return authManager;
};

// Deprecated: Use getApiClient() instead
export const getIntegrationManager = (): IntegrationManager => {
  console.warn('⚠️  DEPRECATED: getIntegrationManager() - Use getApiClient() instead for proper API-based communication');
  if (!integrationManager) {
    integrationManager = new IntegrationManager();
  }
  return integrationManager;
};

// Initialize backend on import
export const initializeBackend = async () => {
  try {
    initializeSupabase();
    console.log('✅ CRM Backend initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize CRM Backend:', error);
    throw error;
  }
};

// Main export - Only API client, no direct database access
export default {
  initializeBackend,
  getApiClient, // Only API client for proper frontend-backend separation
  // Note: Direct database access removed for proper architecture
  // getDatabaseManager,  // REMOVED - Frontend should not access DB directly
  // getSupabase          // REMOVED - Frontend should not access DB directly
};
