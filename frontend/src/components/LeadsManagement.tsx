import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getApiClient } from '../lib/backend';
import { 
  Search, 
  Plus,
  Filter,
  Phone,
  Mail,
  Clock,
  CheckCircle,
  Edit3,
  Target,
  Calendar,
  Activity,
  X,
  ChevronDown,
  ChevronUp,
  Trash2,
  TrendingUp,
  Users,
  ArrowRight,
  UserCheck,
  FileDown,
  FileUp,
  ArrowUpDown,
  User,
  MessageSquare,
  BarChart3,
  PieChart,
  TrendingDown,
  AlertTriangle,
  Timer,
  Eye,
  Bell,
  Zap,
  RefreshCw
} from 'lucide-react';

// Types and Interfaces
interface Lead {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  country: string;
  branch: string;
  qualification: string;
  source: string;
  course: string;
  status: string;
  assignedTo: string;
  followUp: string;
  createdAt: string;
  updatedAt: string;
  notes: Note[];
}

interface Note {
  id: string;
  content: string;
  timestamp: string;
  author: string;
}

interface LeadStats {
  total: number;
  hot: number;
  warm: number;
  followup: number;
  converted: number;
  thisMonth: number;
}

const LeadsManagement: React.FC = () => {
  const { user } = useAuth();
  
  // State Management
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [editingLead, setEditingLead] = useState<string | null>(null);
  const [editedLead, setEditedLead] = useState<Partial<Lead>>({});
  const [showFilters, setShowFilters] = useState(false);
  const [newNote, setNewNote] = useState<{[key: string]: string}>({});
  
  // New states for compact view and detail panel
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showBulkTransferModal, setShowBulkTransferModal] = useState(false);
  const [transferLeadId, setTransferLeadId] = useState<string | null>(null);
  const [bulkTransferCounselor, setBulkTransferCounselor] = useState('');
  const [bulkTransferReason, setBulkTransferReason] = useState('');
  
  // Filter States
  const [dateFilter, setDateFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [countryFilter, setCountryFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [assignedToFilter, setAssignedToFilter] = useState('all');
  
  // Updated Today Tracking
  const [leadsUpdatedToday, setLeadsUpdatedToday] = useState<string[]>([]);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);

  // Add Lead Modal States
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [newLead, setNewLead] = useState<Partial<Lead>>({
    fullName: '',
    email: '',
    phone: '',
    country: '',
    branch: '',
    qualification: '',
    source: '',
    course: '',
    status: 'new',
    assignedTo: '',
    followUp: ''
  });

  // Effects
  useEffect(() => {
    loadLeads();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [leads, searchQuery, dateFilter, dateFrom, dateTo, statusFilter, countryFilter, sourceFilter, assignedToFilter, leadsUpdatedToday]);

  // Data Loading - Production Only
  const loadLeads = async () => {
    try {
      setLoading(true);
      
      // Load from backend API (proper architecture)
      const apiClient = getApiClient();
      const dbLeads = await apiClient.getLeads();
      
      if (dbLeads && Array.isArray(dbLeads)) {
        // Transform API data to match component format
        const transformedLeads = dbLeads.map((lead: any) => ({
          id: lead.id || lead._id || String(Math.random()),
          fullName: lead.name || lead.fullName || 'Unknown',
          email: lead.email || '',
          phone: lead.phone || '',
          country: lead.country || 'Unknown',
          branch: lead.branch || 'Main',
          qualification: lead.qualification || 'Not specified',
          source: lead.source || 'manual',
          course: lead.course || 'MBBS',
          status: lead.status || 'new',
          assignedTo: lead.assigned_to || lead.assignedTo || 'Unassigned',
          followUp: lead.follow_up || lead.followUp || '',
          createdAt: lead.created_at || lead.createdAt || new Date().toISOString(),
          updatedAt: lead.updated_at || lead.updatedAt || new Date().toISOString(),
          notes: Array.isArray(lead.notes) ? lead.notes : []
        }));
        
        setLeads(transformedLeads);
        console.log('✅ Loaded leads from production API:', transformedLeads.length);
      } else {
        // No leads found, set empty array
        setLeads([]);
        console.log('📋 No leads found in production database');
      }
      
    } catch (error) {
      console.error('❌ Error loading leads from production API:', error);
      setLeads([]); // Set empty array on error
      
      // Show user-friendly error message
      alert('Unable to connect to the CRM database. Please check your internet connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Filtering Logic
  const applyFilters = () => {
    let filtered = [...leads];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(lead => 
        lead.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.phone.includes(searchQuery) ||
        lead.id.includes(searchQuery)
      );
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      filtered = filtered.filter(lead => {
        const leadDate = new Date(lead.createdAt);
        const leadDateOnly = new Date(leadDate.getFullYear(), leadDate.getMonth(), leadDate.getDate());
        
        switch (dateFilter) {
          case 'today':
            return leadDateOnly.getTime() === today.getTime();
          case 'yesterday':
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            return leadDateOnly.getTime() === yesterday.getTime();
          case 'week':
            const weekAgo = new Date(today);
            weekAgo.setDate(weekAgo.getDate() - 7);
            return leadDate >= weekAgo;
          case 'month':
            const monthAgo = new Date(today);
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            return leadDate >= monthAgo;
          case 'updated_today':
            return leadsUpdatedToday.includes(lead.id);
          case 'custom':
            if (dateFrom && dateTo) {
              const fromDate = new Date(dateFrom);
              const toDate = new Date(dateTo);
              return leadDate >= fromDate && leadDate <= toDate;
            }
            return true;
          default:
            return true;
        }
      });
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(lead => lead.status === statusFilter);
    }

    // Country filter
    if (countryFilter !== 'all') {
      filtered = filtered.filter(lead => lead.country === countryFilter);
    }

    // Source filter
    if (sourceFilter !== 'all') {
      filtered = filtered.filter(lead => lead.source === sourceFilter);
    }

    // Assigned to filter
    if (assignedToFilter !== 'all') {
      filtered = filtered.filter(lead => lead.assignedTo === assignedToFilter);
    }

    setFilteredLeads(filtered);
  };

  // Helper Functions
  const handleSelectAll = () => {
    if (selectedLeads.length === filteredLeads.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(filteredLeads.map(lead => lead.id));
    }
  };

  const handleLeadSelect = (leadId: string) => {
    setSelectedLeads(prev => 
      prev.includes(leadId) 
        ? prev.filter(id => id !== leadId)
        : [...prev, leadId]
    );
  };

  const handleEditLead = (lead: Lead) => {
    setEditingLead(lead.id);
    setEditedLead(lead);
  };

  const handleSaveLead = async () => {
    try {
      // In production, this would update the lead in Supabase
      const currentDate = new Date().toISOString();
      
      setLeads(prev => prev.map(lead => 
        lead.id === editingLead 
          ? { ...lead, ...editedLead, updatedAt: currentDate }
          : lead
      ));
      
      // Track this lead as updated today
      if (editingLead && !leadsUpdatedToday.includes(editingLead)) {
        setLeadsUpdatedToday(prev => [...prev, editingLead]);
      }
      setLastUpdateTime(new Date());
      
      setEditingLead(null);
      setEditedLead({});
    } catch (error) {
      console.error('Error saving lead:', error);
    }
  };

  const handleCancelEdit = () => {
    setEditingLead(null);
    setEditedLead({});
  };

  const handleAddNote = async (leadId: string) => {
    const noteContent = newNote[leadId];
    if (!noteContent?.trim()) return;

    const newNoteObj: Note = {
      id: Date.now().toString(),
      content: noteContent,
      timestamp: new Date().toISOString(),
      author: user?.name || 'Unknown User'
    };

    try {
      // In production, this would save to Supabase
      setLeads(prev => prev.map(lead => 
        lead.id === leadId 
          ? { 
              ...lead, 
              notes: [newNoteObj, ...lead.notes],
              updatedAt: new Date().toISOString()
            }
          : lead
      ));
      
      // Track this lead as updated today when note is added
      if (!leadsUpdatedToday.includes(leadId)) {
        setLeadsUpdatedToday(prev => [...prev, leadId]);
      }
      setLastUpdateTime(new Date());
      
      setNewNote(prev => ({ ...prev, [leadId]: '' }));
    } catch (error) {
      console.error('Error adding note:', error);
    }
  };

  const getUniqueValues = (field: keyof Omit<Lead, 'notes'>) => {
    return [...new Set(leads.map(lead => lead[field] as string).filter(Boolean))];
  };

  const quickStatusFilter = (status: string) => {
    if (statusFilter === status && status !== 'all') {
      // If clicking the same filter (except 'all'), toggle it off
      setStatusFilter('all');
      setDateFilter('all'); // Also reset date filter when toggling status
    } else {
      // Apply the new filter
      setStatusFilter(status);
      if (status !== 'all') {
        setDateFilter('all'); // Reset date filter when applying status filter
      }
    }
  };

  // Filter to show only leads updated today (toggle on/off)
  const setFilterToUpdatedToday = () => {
    if (dateFilter === 'updated_today') {
      // If already filtering by updated today, switch back to all
      setDateFilter('all');
    } else {
      // If not filtering by updated today, switch to it
      setDateFilter('updated_today');
      setStatusFilter('all'); // Reset status filter to show all updated leads
    }
  };

  // Reset the daily update counter
  const resetDailyCounter = () => {
    setLeadsUpdatedToday([]);
    setLastUpdateTime(null);
  };

  // Add Lead Functions
  const handleAddLead = () => {
    setShowAddLeadModal(true);
  };

  const handleSaveNewLead = async () => {
    try {
      // Validate required fields
      if (!newLead.fullName || !newLead.email || !newLead.phone) {
        alert('Please fill in all required fields (Full Name, Email, Phone)');
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newLead.email || '')) {
        alert('Please enter a valid email address');
        return;
      }

      // Check for duplicate email
      const existingLead = leads.find(lead => lead.email.toLowerCase() === (newLead.email || '').toLowerCase());
      if (existingLead) {
        alert('A lead with this email already exists!');
        return;
      }

      setLoading(true);

      // Prepare lead data for database insertion
      const leadData = {
        name: newLead.fullName,
        email: newLead.email,
        phone: newLead.phone,
        source: (newLead.source || 'manual') as 'website' | 'social_media' | 'referral' | 'manual' | 'advertisement',
        status: (newLead.status || 'new') as 'new' | 'contacted' | 'qualified' | 'proposal' | 'closed_won' | 'closed_lost',
        score: 50, // Default score for new leads
        assigned_to: newLead.assignedTo || user?.name || 'Unassigned',
      };

      // Create via backend API (proper architecture)
      const apiClient = getApiClient();
      const createdLead: any = await apiClient.createLead(leadData);
      
      // Transform API response to component format
      const leadToAdd: Lead = {
        id: createdLead.id || Date.now().toString(),
        fullName: createdLead.name || newLead.fullName || '',
        email: createdLead.email || newLead.email || '',
        phone: createdLead.phone || newLead.phone || '',
        country: newLead.country || 'India',
        branch: newLead.branch || 'Main',
        qualification: newLead.qualification || 'Not specified',
        source: createdLead.source || newLead.source || 'Manual Entry',
        course: newLead.course || 'MBBS',
        status: createdLead.status || newLead.status || 'new',
        assignedTo: createdLead.assigned_to || newLead.assignedTo || user?.name || 'Unassigned',
        followUp: newLead.followUp || '',
        createdAt: createdLead.created_at || new Date().toISOString(),
        updatedAt: createdLead.updated_at || new Date().toISOString(),
        notes: [{
          id: `note-${Date.now()}`,
          content: `Lead created via manual entry by ${user?.name || 'System'}`,
          author: user?.name || 'System',
          timestamp: createdLead.created_at || new Date().toISOString()
        }]
      };

      // Add to leads list
      setLeads(prev => [leadToAdd, ...prev]);

      // Track as updated today
      setLeadsUpdatedToday(prev => [...prev, leadToAdd.id]);
      setLastUpdateTime(new Date());

      // Reset form and close modal
      setNewLead({
        fullName: '',
        email: '',
        phone: '',
        country: '',
        branch: '',
        qualification: '',
        source: '',
        course: '',
        status: 'new',
        assignedTo: '',
        followUp: ''
      });
      setShowAddLeadModal(false);

      alert(`Lead "${newLead.fullName}" added successfully!`);
      console.log('✅ Lead created via production API');
      
    } catch (error) {
      console.error('❌ Error adding lead:', error);
      alert('Unable to create lead. Please check your internet connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelAddLead = () => {
    setNewLead({
      fullName: '',
      email: '',
      phone: '',
      country: '',
      branch: '',
      qualification: '',
      source: '',
      course: '',
      status: 'new',
      assignedTo: '',
      followUp: ''
    });
    setShowAddLeadModal(false);
  };

  // Check if user has manager permissions or above
  const isManager = () => {
    return user?.role === 'manager' || user?.role === 'senior_manager' || user?.role === 'super_admin';
  };

  // Handle lead selection for detail view
  const handleLeadClick = (leadId: string) => {
    setSelectedLeadId(leadId);
    setShowDetailPanel(true);
  };

  // Handle lead transfer
  const handleTransferLead = (leadId: string) => {
    setTransferLeadId(leadId);
    setShowTransferModal(true);
  };

  // Export leads to CSV
  const handleExportLeads = () => {
    const csvContent = [
      ['ID', 'Full Name', 'Email', 'Phone', 'Country', 'Branch', 'Qualification', 'Source', 'Course', 'Status', 'Assigned To', 'Follow Up', 'Created At', 'Updated At'],
      ...filteredLeads.map(lead => [
        lead.id,
        lead.fullName,
        lead.email,
        lead.phone,
        lead.country,
        lead.branch,
        lead.qualification,
        lead.source,
        lead.course,
        lead.status,
        lead.assignedTo,
        lead.followUp,
        lead.createdAt,
        lead.updatedAt
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads-export-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // Import leads from CSV
  const handleImportLeads = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const csv = e.target?.result as string;
      const lines = csv.split('\n');
      
      const importedLeads = lines.slice(1).map((line, index) => {
        const values = line.split(',');
        return {
          id: values[0] || `imported-${Date.now()}-${index}`,
          fullName: values[1] || '',
          email: values[2] || '',
          phone: values[3] || '',
          country: values[4] || '',
          branch: values[5] || '',
          qualification: values[6] || '',
          source: values[7] || '',
          course: values[8] || '',
          status: values[9] || 'New',
          assignedTo: values[10] || '',
          followUp: values[11] || '',
          createdAt: values[12] || new Date().toISOString(),
          updatedAt: values[13] || new Date().toISOString(),
          notes: []
        };
      }).filter(lead => lead.fullName); // Filter out empty rows

      setLeads(prev => [...prev, ...importedLeads]);
    };
    reader.readAsText(file);
    
    // Reset file input
    event.target.value = '';
  };

  // Handle bulk status update
  const handleBulkStatusUpdate = (newStatus: string) => {
    if (!newStatus) return;
    
    setLeads(prev => prev.map(lead => 
      selectedLeads.includes(lead.id) 
        ? { ...lead, status: newStatus, updatedAt: new Date().toISOString() }
        : lead
    ));
    
    // Clear selection after update
    setSelectedLeads([]);
  };

  // Handle bulk delete
  const handleBulkDelete = () => {
    if (window.confirm(`Are you sure you want to delete ${selectedLeads.length} lead(s)? This action cannot be undone.`)) {
      setLeads(prev => prev.filter(lead => !selectedLeads.includes(lead.id)));
      setSelectedLeads([]);
      
      // Close detail panel if selected lead is deleted
      if (selectedLeadId && selectedLeads.includes(selectedLeadId)) {
        setSelectedLeadId(null);
        setShowDetailPanel(false);
      }
    }
  };

  // Handle bulk transfer
  const handleBulkTransfer = () => {
    if (!bulkTransferCounselor) {
      alert('Please select a counselor to transfer leads to.');
      return;
    }

    if (window.confirm(`Are you sure you want to transfer ${selectedLeads.length} lead(s) to ${bulkTransferCounselor}?`)) {
      setLeads(prev => prev.map(lead => 
        selectedLeads.includes(lead.id) 
          ? { 
              ...lead, 
              assignedTo: bulkTransferCounselor, 
              updatedAt: new Date().toISOString(),
              notes: [
                ...lead.notes,
                {
                  id: `note-${Date.now()}`,
                  content: `Lead transferred to ${bulkTransferCounselor}${bulkTransferReason ? `. Reason: ${bulkTransferReason}` : ''}`,
                  author: 'System',
                  timestamp: new Date().toISOString()
                }
              ]
            }
          : lead
      ));
      
      // Track transferred leads as updated today
      const newUpdatedLeads = selectedLeads.filter(id => !leadsUpdatedToday.includes(id));
      if (newUpdatedLeads.length > 0) {
        setLeadsUpdatedToday(prev => [...prev, ...newUpdatedLeads]);
      }
      setLastUpdateTime(new Date());
      
      // Reset form and close modal
      setBulkTransferCounselor('');
      setBulkTransferReason('');
      setShowBulkTransferModal(false);
      setSelectedLeads([]);
      
      // Close detail panel if selected lead was transferred
      if (selectedLeadId && selectedLeads.includes(selectedLeadId)) {
        setSelectedLeadId(null);
        setShowDetailPanel(false);
      }
    }
  };

  const calculateStats = (): LeadStats => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return {
      total: leads.length,
      hot: leads.filter(lead => lead.status === 'hot').length,
      warm: leads.filter(lead => lead.status === 'warm').length,
      followup: leads.filter(lead => lead.status === 'Followup').length,
      converted: leads.filter(lead => lead.status === 'converted').length,
      thisMonth: leads.filter(lead => {
        const leadDate = new Date(lead.createdAt);
        return leadDate.getMonth() === currentMonth && leadDate.getFullYear() === currentYear;
      }).length
    };
  };

  // Advanced Monitoring Functions
  const getAdvancedMetrics = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    // Lead velocity metrics
    const todayLeads = leads.filter(lead => {
      const leadDate = new Date(lead.createdAt);
      const leadDateOnly = new Date(leadDate.getFullYear(), leadDate.getMonth(), leadDate.getDate());
      return leadDateOnly.getTime() === today.getTime();
    });
    
    const yesterdayLeads = leads.filter(lead => {
      const leadDate = new Date(lead.createdAt);
      const leadDateOnly = new Date(leadDate.getFullYear(), leadDate.getMonth(), leadDate.getDate());
      return leadDateOnly.getTime() === yesterday.getTime();
    });
    
    const weekLeads = leads.filter(lead => {
      const leadDate = new Date(lead.createdAt);
      return leadDate >= weekAgo;
    });
    
    // Conversion metrics
    const convertedLeads = leads.filter(lead => lead.status === 'converted');
    const conversionRate = leads.length > 0 ? (convertedLeads.length / leads.length * 100) : 0;
    
    // Response time metrics
    const followupDueLeads = leads.filter(lead => {
      if (!lead.followUp) return false;
      const followupDate = new Date(lead.followUp);
      return followupDate <= now && lead.status !== 'converted';
    });
    
    // Assignment distribution
    const assignmentDistribution = leads.reduce((acc, lead) => {
      const assignee = lead.assignedTo || 'Unassigned';
      acc[assignee] = (acc[assignee] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Source performance
    const sourcePerformance = leads.reduce((acc, lead) => {
      const source = lead.source || 'Unknown';
      if (!acc[source]) {
        acc[source] = { total: 0, converted: 0 };
      }
      acc[source].total++;
      if (lead.status === 'converted') {
        acc[source].converted++;
      }
      return acc;
    }, {} as Record<string, { total: number, converted: number }>);
    
    // Activity metrics
    const lastActivity = leads.reduce((latest, lead) => {
      const leadUpdate = new Date(lead.updatedAt);
      return leadUpdate > latest ? leadUpdate : latest;
    }, new Date(0));
    
    return {
      todayCount: todayLeads.length,
      yesterdayCount: yesterdayLeads.length,
      weekCount: weekLeads.length,
      conversionRate: Math.round(conversionRate * 10) / 10,
      followupDue: followupDueLeads.length,
      assignmentDistribution,
      sourcePerformance,
      lastActivity,
      leadVelocity: todayLeads.length - yesterdayLeads.length, // Change from yesterday
      averageLeadsPerDay: Math.round(weekLeads.length / 7 * 10) / 10
    };
  };

  // Real-time monitoring alerts
  const getMonitoringAlerts = () => {
    const metrics = getAdvancedMetrics();
    const alerts = [];
    
    // Check for overdue followups
    if (metrics.followupDue > 0) {
      alerts.push({
        type: 'warning',
        message: `${metrics.followupDue} leads have overdue followups`,
        action: 'View Overdue',
        icon: AlertTriangle
      });
    }
    
    // Check for low lead velocity
    if (metrics.leadVelocity < -2) {
      alerts.push({
        type: 'danger',
        message: `Lead generation down ${Math.abs(metrics.leadVelocity)} from yesterday`,
        action: 'Check Sources',
        icon: TrendingDown
      });
    }
    
    // Check for unassigned leads
    const unassigned = metrics.assignmentDistribution['Unassigned'] || 0;
    if (unassigned > 5) {
      alerts.push({
        type: 'warning',
        message: `${unassigned} leads are unassigned`,
        action: 'Assign Now',
        icon: UserCheck
      });
    }
    
    // Check for low conversion rate
    if (metrics.conversionRate < 5 && leads.length > 20) {
      alerts.push({
        type: 'info',
        message: `Conversion rate is ${metrics.conversionRate}% - consider optimization`,
        action: 'View Analytics',
        icon: BarChart3
      });
    }
    
    return alerts;
  };

  // Performance insights
  const getPerformanceInsights = () => {
    const metrics = getAdvancedMetrics();
    const insights = [];
    
    // Best performing source
    const bestSource = Object.entries(metrics.sourcePerformance)
      .filter(([_, data]) => data.total >= 3)
      .sort((a, b) => (b[1].converted / b[1].total) - (a[1].converted / a[1].total))[0];
    
    if (bestSource) {
      const rate = Math.round((bestSource[1].converted / bestSource[1].total) * 100);
      insights.push({
        type: 'success',
        title: 'Top Performing Source',
        message: `${bestSource[0]} has ${rate}% conversion rate`,
        icon: TrendingUp
      });
    }
    
    // Most active counselor
    const topCounselor = Object.entries(metrics.assignmentDistribution)
      .filter(([name]) => name !== 'Unassigned')
      .sort((a, b) => b[1] - a[1])[0];
    
    if (topCounselor) {
      insights.push({
        type: 'info',
        title: 'Most Active Counselor',
        message: `${topCounselor[0]} managing ${topCounselor[1]} leads`,
        icon: User
      });
    }
    
    // Recent activity
    const timeSinceLastActivity = Date.now() - metrics.lastActivity.getTime();
    const hoursSince = Math.floor(timeSinceLastActivity / (1000 * 60 * 60));
    
    if (hoursSince < 1) {
      insights.push({
        type: 'success',
        title: 'Recent Activity',
        message: 'Leads updated within the last hour',
        icon: Zap
      });
    } else if (hoursSince > 24) {
      insights.push({
        type: 'warning',
        title: 'Low Activity',
        message: `No lead updates for ${hoursSince} hours`,
        icon: Timer
      });
    }
    
    return insights;
  };

  const stats = calculateStats();
  const advancedMetrics = getAdvancedMetrics();
  const monitoringAlerts = getMonitoringAlerts();
  const performanceInsights = getPerformanceInsights();

  // Get leads updated today count
  const getLeadsUpdatedTodayCount = () => {
    return leadsUpdatedToday.length;
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Lead Management</h1>
            <p className="text-gray-600 mt-1">Manage and track all your leads in one place</p>
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-600">
              {selectedLeads.length} of {filteredLeads.length} selected
            </span>
            
            {/* Import/Export Buttons */}
            <div className="flex items-center space-x-2">
              <button 
                onClick={handleExportLeads}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 text-sm"
              >
                <FileDown className="w-4 h-4" />
                <span>Export</span>
              </button>
              
              <label className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 cursor-pointer text-sm">
                <FileUp className="w-4 h-4" />
                <span>Import</span>
                <input 
                  type="file" 
                  accept=".csv" 
                  onChange={handleImportLeads}
                  className="hidden"
                />
              </label>
            </div>
            
            <button 
              onClick={handleAddLead}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 shadow-sm"
            >
              <Plus className="w-5 h-5" />
              <span>Add Lead</span>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Leads</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Hot Leads</p>
                <p className="text-2xl font-bold text-red-600">{stats.hot}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-red-600" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Warm Leads</p>
                <p className="text-2xl font-bold text-orange-600">{stats.warm}</p>
              </div>
              <Activity className="h-8 w-8 text-orange-600" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Follow-ups</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.followup}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">This Month</p>
                <p className="text-2xl font-bold text-green-600">{stats.thisMonth}</p>
              </div>
              <Calendar className="h-8 w-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Converted</p>
                <p className="text-2xl font-bold text-purple-600">{stats.converted}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-purple-600" />
            </div>
          </div>

          {/* New Updated Today Card */}
          <div className="bg-white p-4 rounded-lg shadow-sm border-2 border-cyan-200 bg-gradient-to-br from-cyan-50 to-blue-50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-cyan-700">Updated Today</p>
                <p className="text-2xl font-bold text-cyan-600">{getLeadsUpdatedTodayCount()}</p>
                {lastUpdateTime && (
                  <p className="text-xs text-cyan-500 mt-1">
                    Last: {lastUpdateTime.toLocaleTimeString()}
                  </p>
                )}
                {getLeadsUpdatedTodayCount() > 0 && (
                  <button
                    onClick={resetDailyCounter}
                    className="text-xs text-cyan-600 hover:text-cyan-800 underline mt-1"
                  >
                    Reset counter
                  </button>
                )}
              </div>
              <Edit3 className="h-8 w-8 text-cyan-600" />
            </div>
          </div>
        </div>

        {/* Advanced Monitoring Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          
          {/* Real-time Alerts */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Bell className="w-5 h-5 mr-2 text-red-500" />
                Monitoring Alerts
              </h3>
              <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                {monitoringAlerts.length}
              </span>
            </div>
            
            {monitoringAlerts.length === 0 ? (
              <div className="text-center py-4">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                <p className="text-sm text-gray-600">All systems normal</p>
              </div>
            ) : (
              <div className="space-y-3">
                {monitoringAlerts.map((alert, index) => {
                  const IconComponent = alert.icon;
                  return (
                    <div key={index} className={`p-3 rounded-lg border-l-4 ${
                      alert.type === 'danger' ? 'border-red-500 bg-red-50' :
                      alert.type === 'warning' ? 'border-yellow-500 bg-yellow-50' :
                      'border-blue-500 bg-blue-50'
                    }`}>
                      <div className="flex items-start">
                        <IconComponent className={`w-5 h-5 mr-2 mt-0.5 ${
                          alert.type === 'danger' ? 'text-red-500' :
                          alert.type === 'warning' ? 'text-yellow-500' :
                          'text-blue-500'
                        }`} />
                        <div className="flex-1">
                          <p className="text-sm text-gray-800">{alert.message}</p>
                          <button className={`text-xs mt-1 font-medium ${
                            alert.type === 'danger' ? 'text-red-600' :
                            alert.type === 'warning' ? 'text-yellow-600' :
                            'text-blue-600'
                          }`}>
                            {alert.action} →
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Performance Metrics */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <BarChart3 className="w-5 h-5 mr-2 text-blue-500" />
                Performance Metrics
              </h3>
              <button className="text-xs text-blue-600 hover:text-blue-800">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Conversion Rate</span>
                <div className="flex items-center">
                  <span className="text-lg font-bold text-green-600">{advancedMetrics.conversionRate}%</span>
                  {advancedMetrics.conversionRate > 10 ? (
                    <TrendingUp className="w-4 h-4 text-green-500 ml-1" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-500 ml-1" />
                  )}
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Leads Today</span>
                <div className="flex items-center">
                  <span className="text-lg font-bold text-blue-600">{advancedMetrics.todayCount}</span>
                  <span className={`text-xs ml-2 px-2 py-1 rounded-full ${
                    advancedMetrics.leadVelocity > 0 ? 'bg-green-100 text-green-800' :
                    advancedMetrics.leadVelocity < 0 ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {advancedMetrics.leadVelocity > 0 ? '+' : ''}{advancedMetrics.leadVelocity}
                  </span>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Overdue Followups</span>
                <span className={`text-lg font-bold ${
                  advancedMetrics.followupDue > 0 ? 'text-red-600' : 'text-green-600'
                }`}>
                  {advancedMetrics.followupDue}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Avg/Day (Week)</span>
                <span className="text-lg font-bold text-purple-600">{advancedMetrics.averageLeadsPerDay}</span>
              </div>
            </div>
          </div>

          {/* Performance Insights */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Eye className="w-5 h-5 mr-2 text-purple-500" />
                Insights
              </h3>
            </div>
            
            {performanceInsights.length === 0 ? (
              <div className="text-center py-4">
                <PieChart className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">No insights available</p>
              </div>
            ) : (
              <div className="space-y-4">
                {performanceInsights.map((insight, index) => {
                  const IconComponent = insight.icon;
                  return (
                    <div key={index} className={`p-3 rounded-lg ${
                      insight.type === 'success' ? 'bg-green-50 border border-green-200' :
                      insight.type === 'warning' ? 'bg-yellow-50 border border-yellow-200' :
                      'bg-blue-50 border border-blue-200'
                    }`}>
                      <div className="flex items-start">
                        <IconComponent className={`w-5 h-5 mr-2 mt-0.5 ${
                          insight.type === 'success' ? 'text-green-500' :
                          insight.type === 'warning' ? 'text-yellow-500' :
                          'text-blue-500'
                        }`} />
                        <div>
                          <p className="text-sm font-medium text-gray-800">{insight.title}</p>
                          <p className="text-xs text-gray-600">{insight.message}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Assignment Distribution Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Users className="w-5 h-5 mr-2 text-indigo-500" />
            Team Workload Distribution
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Object.entries(advancedMetrics.assignmentDistribution).map(([counselor, count]) => (
              <div key={counselor} className="text-center">
                <div className="bg-indigo-100 rounded-lg p-4 mb-2">
                  <User className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
                  <span className="text-2xl font-bold text-indigo-800">{count}</span>
                </div>
                <p className="text-xs text-gray-600 truncate" title={counselor}>
                  {counselor}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Status Filters */}
      <div className="mb-6 flex flex-wrap gap-3">
        <button
          onClick={() => quickStatusFilter('hot')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
            statusFilter === 'hot' 
              ? 'bg-red-100 text-red-800 border-2 border-red-300 shadow-md' 
              : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50 hover:shadow-sm'
          }`}
        >
          🔥 Hot
        </button>
        <button
          onClick={() => quickStatusFilter('warm')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
            statusFilter === 'warm' 
              ? 'bg-orange-100 text-orange-800 border-2 border-orange-300 shadow-md' 
              : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50 hover:shadow-sm'
          }`}
        >
          🌡️ Warm
        </button>
        <button
          onClick={() => quickStatusFilter('Followup')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
            statusFilter === 'Followup' 
              ? 'bg-yellow-100 text-yellow-800 border-2 border-yellow-300 shadow-md' 
              : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50 hover:shadow-sm'
          }`}
        >
          📅 Follow-up
        </button>
        <button
          onClick={() => quickStatusFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
            statusFilter === 'all' 
              ? 'bg-blue-100 text-blue-800 border-2 border-blue-300 shadow-md' 
              : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50 hover:shadow-sm'
          }`}
        >
          📊 All
        </button>
        
        {/* Updated Today Filter */}
        <button
          onClick={() => setFilterToUpdatedToday()}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
            dateFilter === 'updated_today' 
              ? 'bg-cyan-100 text-cyan-800 border-2 border-cyan-300 shadow-md' 
              : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50 hover:shadow-sm'
          }`}
        >
          {dateFilter === 'updated_today' 
            ? `✅ Showing Updated Today (${getLeadsUpdatedTodayCount()})` 
            : `✏️ Updated Today (${getLeadsUpdatedTodayCount()})`
          }
        </button>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search leads by name, email, phone, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Filter className="w-4 h-4" />
            <span>Advanced Filters</span>
            {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date Filter</label>
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="week">Last 7 Days</option>
                  <option value="month">Last 30 Days</option>
                  <option value="updated_today">Updated Today ({getLeadsUpdatedTodayCount()})</option>
                  <option value="custom">Custom Range</option>
                </select>
              </div>

              {dateFilter === 'custom' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Status</option>
                  {getUniqueValues('status').map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                <select
                  value={countryFilter}
                  onChange={(e) => setCountryFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Countries</option>
                  {getUniqueValues('country').map(country => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Source</label>
                <select
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Sources</option>
                  {getUniqueValues('source').map(source => (
                    <option key={source} value={source}>{source}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Assigned To</label>
                <select
                  value={assignedToFilter}
                  onChange={(e) => setAssignedToFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Assigned</option>
                  {getUniqueValues('assignedTo').map(assigned => (
                    <option key={assigned} value={assigned}>{assigned}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content - Compact Layout with Detail Panel */}
      <div className="flex gap-6">
        {/* Leads List - Compact View */}
        <div className={`${showDetailPanel ? 'w-2/3' : 'w-full'} transition-all duration-300`}>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            {/* Enhanced Header with bulk actions */}
            <div className="p-4 border-b border-gray-200 space-y-3">
              {/* Top row - Title and selection info */}
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                  Leads Management ({filteredLeads.length})
                </h2>
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={selectedLeads.length === filteredLeads.length && filteredLeads.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-600">
                    {selectedLeads.length > 0 ? `${selectedLeads.length} selected` : `Select all`}
                  </span>
                </div>
              </div>

              {/* Enhanced Bulk Actions Row */}
              {selectedLeads.length > 0 && (
                <div className="flex items-center justify-between bg-blue-50 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-blue-900">
                      {selectedLeads.length} lead{selectedLeads.length > 1 ? 's' : ''} selected
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {/* Bulk Status Update */}
                    <select
                      onChange={(e) => handleBulkStatusUpdate(e.target.value)}
                      className="px-3 py-1.5 border border-blue-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                      defaultValue=""
                    >
                      <option value="" disabled>Update Status</option>
                      <option value="hot">Hot</option>
                      <option value="warm">Warm</option>
                      <option value="Followup">Follow Up</option>
                      <option value="will enroll later">Will Enroll Later</option>
                      <option value="Not interested">Not Interested</option>
                      <option value="enrolled">Enrolled</option>
                    </select>

                    {/* Bulk Delete */}
                    <button
                      onClick={handleBulkDelete}
                      className="bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 flex items-center space-x-1 text-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete</span>
                    </button>

                    {/* Bulk Transfer - Only for managers */}
                    {isManager() && (
                      <button
                        onClick={() => setShowBulkTransferModal(true)}
                        className="bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 flex items-center space-x-1 text-sm"
                      >
                        <ArrowUpDown className="w-4 h-4" />
                        <span>Transfer</span>
                      </button>
                    )}

                    {/* Clear Selection */}
                    <button
                      onClick={() => setSelectedLeads([])}
                      className="text-gray-500 hover:text-gray-700 px-2 py-1.5 text-sm"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Enhanced Systematic Leads List */}
            <div className="divide-y divide-gray-100">
              {filteredLeads.map((lead) => (
                <div 
                  key={lead.id}
                  className={`p-4 hover:bg-gray-50 transition-colors ${
                    selectedLeadId === lead.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1">
                      <input
                        type="checkbox"
                        checked={selectedLeads.includes(lead.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleLeadSelect(lead.id);
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      
                      {/* Lead Info Grid - More Systematic Layout */}
                      <div className="grid grid-cols-4 gap-4 flex-1 cursor-pointer" onClick={() => handleLeadClick(lead.id)}>
                        {/* Primary Info Column */}
                        <div className="space-y-1">
                          {editingLead === lead.id ? (
                            <input
                              type="text"
                              value={editedLead.fullName || lead.fullName}
                              onChange={(e) => setEditedLead(prev => ({ ...prev, fullName: e.target.value }))}
                              className="font-medium text-gray-900 bg-white border border-gray-300 rounded px-2 py-1 text-sm w-full"
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            <h3 className="font-medium text-gray-900">{lead.fullName}</h3>
                          )}
                          <p className="text-xs text-gray-500">#{lead.id}</p>
                          <div className="flex items-center space-x-1">
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                              lead.status === 'hot' ? 'bg-red-100 text-red-800' :
                              lead.status === 'warm' ? 'bg-orange-100 text-orange-800' :
                              lead.status === 'Followup' ? 'bg-yellow-100 text-yellow-800' :
                              lead.status === 'will enroll later' ? 'bg-blue-100 text-blue-800' :
                              lead.status === 'Not interested' ? 'bg-gray-100 text-gray-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {lead.status}
                            </span>
                          </div>
                        </div>

                        {/* Contact Info Column */}
                        <div className="space-y-1">
                          {editingLead === lead.id ? (
                            <>
                              <input
                                type="email"
                                value={editedLead.email || lead.email}
                                onChange={(e) => setEditedLead(prev => ({ ...prev, email: e.target.value }))}
                                className="text-sm text-gray-600 bg-white border border-gray-300 rounded px-2 py-1 w-full"
                                onClick={(e) => e.stopPropagation()}
                              />
                              <input
                                type="tel"
                                value={editedLead.phone || lead.phone}
                                onChange={(e) => setEditedLead(prev => ({ ...prev, phone: e.target.value }))}
                                className="text-sm text-gray-500 bg-white border border-gray-300 rounded px-2 py-1 w-full"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </>
                          ) : (
                            <>
                              <p className="text-sm text-gray-600 flex items-center">
                                <Mail className="w-3 h-3 mr-1" />
                                {lead.email}
                              </p>
                              <p className="text-sm text-gray-500 flex items-center">
                                <Phone className="w-3 h-3 mr-1" />
                                {lead.phone}
                              </p>
                            </>
                          )}
                        </div>

                        {/* Academic Info Column */}
                        <div className="space-y-1">
                          {editingLead === lead.id ? (
                            <>
                              <select
                                value={editedLead.country || lead.country}
                                onChange={(e) => setEditedLead(prev => ({ ...prev, country: e.target.value }))}
                                className="text-sm text-gray-600 bg-white border border-gray-300 rounded px-2 py-1 w-full"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <option value="USA">USA</option>
                                <option value="Canada">Canada</option>
                                <option value="UK">UK</option>
                                <option value="Australia">Australia</option>
                                <option value="Pakistan">Pakistan</option>
                                <option value="India">India</option>
                              </select>
                              <select
                                value={editedLead.qualification || lead.qualification}
                                onChange={(e) => setEditedLead(prev => ({ ...prev, qualification: e.target.value }))}
                                className="text-sm text-gray-500 bg-white border border-gray-300 rounded px-2 py-1 w-full"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <option value="">Select Qualification</option>
                                <option value="High School">High School</option>
                                <option value="Intermediate">Intermediate</option>
                                <option value="A-Levels">A-Levels</option>
                                <option value="Bachelor's Degree">Bachelor's Degree</option>
                                <option value="Master's Degree">Master's Degree</option>
                                <option value="PhD">PhD</option>
                                <option value="MBBS">MBBS</option>
                                <option value="BDS">BDS</option>
                                <option value="Engineering">Engineering</option>
                                <option value="MBA">MBA</option>
                                <option value="Other">Other</option>
                              </select>
                            </>
                          ) : (
                            <>
                              <p className="text-sm text-gray-600">{lead.country}</p>
                              <p className="text-sm text-gray-500">{lead.qualification}</p>
                              <p className="text-xs text-gray-400">{lead.course}</p>
                            </>
                          )}
                        </div>

                        {/* Assignment & Date Column */}
                        <div className="space-y-1">
                          {editingLead === lead.id ? (
                            <select
                              value={editedLead.assignedTo || lead.assignedTo}
                              onChange={(e) => setEditedLead(prev => ({ ...prev, assignedTo: e.target.value }))}
                              className="text-sm text-gray-600 bg-white border border-gray-300 rounded px-2 py-1 w-full"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <option value="beenish">Beenish</option>
                              <option value="john">John Doe</option>
                              <option value="jane">Jane Smith</option>
                              <option value="mike">Mike Johnson</option>
                            </select>
                          ) : (
                            <p className="text-sm text-gray-600 font-medium">{lead.assignedTo}</p>
                          )}
                          <p className="text-xs text-gray-500">{new Date(lead.createdAt).toLocaleDateString()}</p>
                          <p className="text-xs text-gray-400">{lead.source}</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex items-center space-x-2 ml-4">
                      {editingLead === lead.id ? (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSaveLead();
                            }}
                            className="text-green-600 hover:text-green-800 p-1"
                            title="Save changes"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancelEdit();
                            }}
                            className="text-gray-500 hover:text-gray-700 p-1"
                            title="Cancel editing"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditLead(lead);
                            }}
                            className="text-blue-600 hover:text-blue-800 p-1"
                            title="Edit lead"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          {isManager() && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTransferLead(lead.id);
                              }}
                              className="text-purple-600 hover:text-purple-800 p-1"
                              title="Transfer lead"
                            >
                              <ArrowUpDown className="w-4 h-4" />
                            </button>
                          )}
                          <ArrowRight className="w-4 h-4 text-gray-400" />
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Enhanced Detail Panel */}
        {showDetailPanel && selectedLeadId && (
          <div className="w-1/3 bg-white rounded-xl shadow-lg border border-gray-200 h-fit overflow-hidden">
            {(() => {
              const selectedLead = leads.find(l => l.id === selectedLeadId);
              if (!selectedLead) return null;
              
              return (
                <div>
                  {/* Enhanced Detail Header */}
                  <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="bg-white bg-opacity-20 p-2 rounded-lg">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">Lead Details</h3>
                        <p className="text-blue-100 text-sm">ID: #{selectedLead.id}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowDetailPanel(false)}
                      className="text-blue-100 hover:text-white transition-colors p-1 rounded-lg hover:bg-white hover:bg-opacity-20"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Lead Information */}
                  <div className="p-6 space-y-6">
                    {/* Primary Contact Info */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 text-lg mb-3 flex items-center">
                        <User className="w-5 h-5 mr-2 text-blue-600" />
                        Contact Information
                      </h4>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                          {editingLead === selectedLead.id ? (
                            <input
                              type="text"
                              value={editedLead.fullName || selectedLead.fullName}
                              onChange={(e) => setEditedLead(prev => ({ ...prev, fullName: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          ) : (
                            <div className="flex items-center justify-between">
                              <span className="text-gray-900 font-medium">{selectedLead.fullName}</span>
                              <button
                                onClick={() => handleEditLead(selectedLead)}
                                className="text-blue-600 hover:text-blue-800 p-1"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            {editingLead === selectedLead.id ? (
                              <input
                                type="email"
                                value={editedLead.email || selectedLead.email}
                                onChange={(e) => setEditedLead(prev => ({ ...prev, email: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            ) : (
                              <div className="flex items-center space-x-2 text-gray-700">
                                <Mail className="w-4 h-4 text-gray-400" />
                                <span>{selectedLead.email}</span>
                              </div>
                            )}
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                            {editingLead === selectedLead.id ? (
                              <input
                                type="tel"
                                value={editedLead.phone || selectedLead.phone}
                                onChange={(e) => setEditedLead(prev => ({ ...prev, phone: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            ) : (
                              <div className="flex items-center space-x-2 text-gray-700">
                                <Phone className="w-4 h-4 text-gray-400" />
                                <span>{selectedLead.phone}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Academic Details */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 text-lg mb-3 flex items-center">
                        <Calendar className="w-5 h-5 mr-2 text-green-600" />
                        Academic Information
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                          {editingLead === selectedLead.id ? (
                            <select
                              value={editedLead.country || selectedLead.country}
                              onChange={(e) => setEditedLead(prev => ({ ...prev, country: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value="USA">USA</option>
                              <option value="Canada">Canada</option>
                              <option value="UK">UK</option>
                              <option value="Australia">Australia</option>
                              <option value="Pakistan">Pakistan</option>
                              <option value="India">India</option>
                            </select>
                          ) : (
                            <span className="text-gray-700">{selectedLead.country}</span>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                          {editingLead === selectedLead.id ? (
                            <input
                              type="text"
                              value={editedLead.branch || selectedLead.branch}
                              onChange={(e) => setEditedLead(prev => ({ ...prev, branch: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          ) : (
                            <span className="text-gray-700">{selectedLead.branch}</span>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Qualification</label>
                          {editingLead === selectedLead.id ? (
                            <select
                              value={editedLead.qualification || selectedLead.qualification}
                              onChange={(e) => setEditedLead(prev => ({ ...prev, qualification: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value="">Select Qualification</option>
                              <option value="High School">High School</option>
                              <option value="Intermediate">Intermediate</option>
                              <option value="A-Levels">A-Levels</option>
                              <option value="Bachelor's Degree">Bachelor's Degree</option>
                              <option value="Master's Degree">Master's Degree</option>
                              <option value="PhD">PhD</option>
                              <option value="Diploma">Diploma</option>
                              <option value="Certificate">Certificate</option>
                              <option value="MBBS">MBBS</option>
                              <option value="BDS">BDS</option>
                              <option value="Engineering">Engineering</option>
                              <option value="MBA">MBA</option>
                              <option value="Other">Other</option>
                            </select>
                          ) : (
                            <span className="text-gray-700">{selectedLead.qualification}</span>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
                          {editingLead === selectedLead.id ? (
                            <select
                              value={editedLead.course || selectedLead.course}
                              onChange={(e) => setEditedLead(prev => ({ ...prev, course: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value="">Select Course</option>
                              <optgroup label="Medical Sciences">
                                <option value="MBBS">MBBS</option>
                                <option value="BDS">BDS</option>
                                <option value="Pharmacy">Pharmacy</option>
                                <option value="Nursing">Nursing</option>
                                <option value="Physical Therapy">Physical Therapy</option>
                                <option value="Medical Laboratory Technology">Medical Laboratory Technology</option>
                              </optgroup>
                              <optgroup label="Engineering">
                                <option value="Computer Engineering">Computer Engineering</option>
                                <option value="Software Engineering">Software Engineering</option>
                                <option value="Electrical Engineering">Electrical Engineering</option>
                                <option value="Mechanical Engineering">Mechanical Engineering</option>
                                <option value="Civil Engineering">Civil Engineering</option>
                                <option value="Chemical Engineering">Chemical Engineering</option>
                              </optgroup>
                              <optgroup label="Business & Management">
                                <option value="MBA">MBA</option>
                                <option value="BBA">BBA</option>
                                <option value="Accounting & Finance">Accounting & Finance</option>
                                <option value="Marketing">Marketing</option>
                                <option value="Human Resources">Human Resources</option>
                              </optgroup>
                              <optgroup label="Computer Science">
                                <option value="Computer Science">Computer Science</option>
                                <option value="Information Technology">Information Technology</option>
                                <option value="Data Science">Data Science</option>
                                <option value="Artificial Intelligence">Artificial Intelligence</option>
                                <option value="Cybersecurity">Cybersecurity</option>
                              </optgroup>
                              <optgroup label="Social Sciences">
                                <option value="Psychology">Psychology</option>
                                <option value="Sociology">Sociology</option>
                                <option value="International Relations">International Relations</option>
                                <option value="Political Science">Political Science</option>
                              </optgroup>
                              <optgroup label="Others">
                                <option value="Law">Law</option>
                                <option value="Architecture">Architecture</option>
                                <option value="Fine Arts">Fine Arts</option>
                                <option value="Mass Communication">Mass Communication</option>
                                <option value="Education">Education</option>
                                <option value="Other">Other</option>
                              </optgroup>
                            </select>
                          ) : (
                            <span className="text-gray-700">{selectedLead.course}</span>
                          )}
                        </div>
                        
                        <div className="col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                          {editingLead === selectedLead.id ? (
                            <select
                              value={editedLead.source || selectedLead.source}
                              onChange={(e) => setEditedLead(prev => ({ ...prev, source: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value="Website">Website</option>
                              <option value="Facebook Ads">Facebook Ads</option>
                              <option value="Google Ads">Google Ads</option>
                              <option value="Referral">Referral</option>
                              <option value="Walk-in">Walk-in</option>
                              <option value="Phone Call">Phone Call</option>
                            </select>
                          ) : (
                            <span className="text-gray-700">{selectedLead.source}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Status & Assignment Management */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 text-lg mb-3 flex items-center">
                        <Activity className="w-5 h-5 mr-2 text-purple-600" />
                        Status & Assignment
                      </h4>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                          <select
                            value={editedLead.status || selectedLead.status}
                            onChange={(e) => {
                              const newStatus = e.target.value;
                              setEditedLead(prev => ({ ...prev, status: newStatus }));
                              // Auto-save status changes
                              setLeads(prevLeads => prevLeads.map(lead => 
                                lead.id === selectedLead.id 
                                  ? { ...lead, status: newStatus, updatedAt: new Date().toISOString() }
                                  : lead
                              ));
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="hot">🔥 Hot</option>
                            <option value="warm">🌡️ Warm</option>
                            <option value="Followup">📞 Follow Up</option>
                            <option value="will enroll later">⏳ Will Enroll Later</option>
                            <option value="Not interested">❌ Not Interested</option>
                            <option value="enrolled">✅ Enrolled</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Assigned to</label>
                          {editingLead === selectedLead.id ? (
                            <select
                              value={editedLead.assignedTo || selectedLead.assignedTo}
                              onChange={(e) => setEditedLead(prev => ({ ...prev, assignedTo: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value="beenish">Beenish</option>
                              <option value="john">John Doe</option>
                              <option value="jane">Jane Smith</option>
                              <option value="mike">Mike Johnson</option>
                            </select>
                          ) : (
                            <div className="flex items-center justify-between">
                              <span className="text-gray-700 font-medium">{selectedLead.assignedTo}</span>
                              {isManager() && (
                                <button
                                  onClick={() => handleTransferLead(selectedLead.id)}
                                  className="text-blue-600 hover:text-blue-800 text-sm flex items-center space-x-1"
                                >
                                  <UserCheck className="w-4 h-4" />
                                  <span>Transfer</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Follow Up Date</label>
                          <input
                            type="datetime-local"
                            value={editedLead.followUp || selectedLead.followUp}
                            onChange={(e) => {
                              const newFollowUp = e.target.value;
                              setEditedLead(prev => ({ ...prev, followUp: newFollowUp }));
                              // Auto-save follow-up changes
                              setLeads(prevLeads => prevLeads.map(lead => 
                                lead.id === selectedLead.id 
                                  ? { ...lead, followUp: newFollowUp, updatedAt: new Date().toISOString() }
                                  : lead
                              ));
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            {selectedLead.followUp && new Date(selectedLead.followUp) > new Date() 
                              ? `⏰ Reminder set for ${new Date(selectedLead.followUp).toLocaleString()}`
                              : selectedLead.followUp && new Date(selectedLead.followUp) <= new Date()
                              ? '🔔 Follow-up is overdue!'
                              : 'No follow-up scheduled'
                            }
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Edit Actions */}
                    {editingLead === selectedLead.id && (
                      <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                        <button
                          onClick={handleCancelEdit}
                          className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveLead}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span>Save Changes</span>
                        </button>
                      </div>
                    )}

                    {/* Notes Section */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 text-lg mb-3 flex items-center">
                        <MessageSquare className="w-5 h-5 mr-2 text-orange-600" />
                        Notes & Communication
                      </h4>
                      <div className="space-y-3 max-h-60 overflow-y-auto">
                        {selectedLead.notes.map((note) => (
                          <div key={note.id} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                            <p className="text-sm text-gray-900 mb-2">{note.content}</p>
                            <div className="flex items-center justify-between text-xs text-gray-500">
                              <span className="font-medium">{note.author}</span>
                              <span>{new Date(note.timestamp).toLocaleString()}</span>
                            </div>
                          </div>
                        ))}
                        {selectedLead.notes.length === 0 && (
                          <p className="text-gray-500 text-sm italic">No notes added yet</p>
                        )}
                      </div>
                      
                      {/* Add Note */}
                      <div className="mt-4">
                        <div className="flex space-x-2">
                          <input
                            type="text"
                            placeholder="Add a note..."
                            value={newNote[selectedLead.id] || ''}
                            onChange={(e) => setNewNote(prev => ({
                              ...prev,
                              [selectedLead.id]: e.target.value
                            }))}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                handleAddNote(selectedLead.id);
                              }
                            }}
                          />
                          <button
                            onClick={() => handleAddNote(selectedLead.id)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center space-x-1"
                          >
                            <Plus className="w-4 h-4" />
                            <span>Add</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Transfer Lead</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Transfer to Counselor
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <option value="">Select Counselor</option>
                  <option value="beenish">Beenish</option>
                  <option value="john">John Doe</option>
                  <option value="jane">Jane Smith</option>
                  <option value="mike">Mike Johnson</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Transfer Reason (Optional)
                </label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter reason for transfer..."
                />
              </div>
            </div>
            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowTransferModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // Handle transfer logic here
                  console.log('Transfer lead:', transferLeadId);
                  setShowTransferModal(false);
                  setTransferLeadId(null);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Transfer Lead
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Bulk Transfer Modal */}
      {showBulkTransferModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg mx-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <ArrowUpDown className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Bulk Transfer
                  </h3>
                  <p className="text-sm text-gray-500">
                    Transfer {selectedLeads.length} lead{selectedLeads.length > 1 ? 's' : ''} to another counselor
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowBulkTransferModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Selected leads summary */}
            <div className="mb-6 bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900">Selected Leads</h4>
                <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                  {selectedLeads.length} leads
                </span>
              </div>
              <div className="max-h-32 overflow-y-auto space-y-2">
                {selectedLeads.map(leadId => {
                  const lead = leads.find(l => l.id === leadId);
                  return lead ? (
                    <div key={leadId} className="flex justify-between items-center bg-white p-2 rounded border">
                      <div>
                        <span className="font-medium text-sm text-gray-900">{lead.fullName}</span>
                        <p className="text-xs text-gray-500">{lead.email}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Currently assigned to:</p>
                        <span className="text-sm font-medium text-gray-700">{lead.assignedTo}</span>
                      </div>
                    </div>
                  ) : null;
                })}
              </div>
            </div>

            {/* Transfer Form */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <span className="flex items-center space-x-1">
                    <UserCheck className="w-4 h-4" />
                    <span>Transfer to Counselor</span>
                    <span className="text-red-500">*</span>
                  </span>
                </label>
                <select 
                  value={bulkTransferCounselor}
                  onChange={(e) => setBulkTransferCounselor(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Counselor</option>
                  <option value="beenish">Beenish</option>
                  <option value="john">John Doe</option>
                  <option value="jane">Jane Smith</option>
                  <option value="mike">Mike Johnson</option>
                  <option value="sara">Sara Wilson</option>
                  <option value="alex">Alex Brown</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <span className="flex items-center space-x-1">
                    <MessageSquare className="w-4 h-4" />
                    <span>Transfer Reason</span>
                    <span className="text-gray-400">(Optional)</span>
                  </span>
                </label>
                <textarea
                  value={bulkTransferReason}
                  onChange={(e) => setBulkTransferReason(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter reason for bulk transfer (e.g., workload redistribution, specialization, etc.)"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowBulkTransferModal(false);
                  setBulkTransferCounselor('');
                  setBulkTransferReason('');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkTransfer}
                disabled={!bulkTransferCounselor}
                className={`px-6 py-2 rounded-lg font-medium flex items-center space-x-2 ${
                  bulkTransferCounselor 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                <ArrowUpDown className="w-4 h-4" />
                <span>Transfer {selectedLeads.length} Lead{selectedLeads.length > 1 ? 's' : ''}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Lead Modal */}
      {showAddLeadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Add New Lead</h2>
                <p className="text-sm text-gray-600 mt-1">Enter lead information to add to your CRM</p>
              </div>
              <button
                onClick={handleCancelAddLead}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Full Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newLead.fullName || ''}
                    onChange={(e) => setNewLead({...newLead, fullName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter full name"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={newLead.email || ''}
                    onChange={(e) => setNewLead({...newLead, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter email address"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={newLead.phone || ''}
                    onChange={(e) => setNewLead({...newLead, phone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter phone number"
                  />
                </div>

                {/* Country */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                  <select
                    value={newLead.country || ''}
                    onChange={(e) => setNewLead({...newLead, country: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Country</option>
                    <option value="IN">India</option>
                    <option value="US">United States</option>
                    <option value="UK">United Kingdom</option>
                    <option value="CA">Canada</option>
                    <option value="AU">Australia</option>
                    <option value="BD">Bangladesh</option>
                    <option value="PK">Pakistan</option>
                    <option value="LK">Sri Lanka</option>
                    <option value="NP">Nepal</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Branch */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Branch</label>
                  <select
                    value={newLead.branch || ''}
                    onChange={(e) => setNewLead({...newLead, branch: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Branch</option>
                    <option value="Delhi">Delhi</option>
                    <option value="Mumbai">Mumbai</option>
                    <option value="Bangalore">Bangalore</option>
                    <option value="Chennai">Chennai</option>
                    <option value="Kolkata">Kolkata</option>
                    <option value="Online">Online</option>
                  </select>
                </div>

                {/* Qualification */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Qualification</label>
                  <select
                    value={newLead.qualification || ''}
                    onChange={(e) => setNewLead({...newLead, qualification: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Qualification</option>
                    <option value="MBBS">MBBS</option>
                    <option value="MD">MD</option>
                    <option value="MS">MS</option>
                    <option value="BDS">BDS</option>
                    <option value="MDS">MDS</option>
                    <option value="BAMS">BAMS</option>
                    <option value="BHMS">BHMS</option>
                    <option value="BPT">BPT</option>
                    <option value="MBBS/FMG">MBBS/FMG</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Source */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Lead Source</label>
                  <select
                    value={newLead.source || ''}
                    onChange={(e) => setNewLead({...newLead, source: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Source</option>
                    <option value="Website">Website</option>
                    <option value="Facebook Ads">Facebook Ads</option>
                    <option value="Google Ads">Google Ads</option>
                    <option value="Referral">Referral</option>
                    <option value="Walk-in">Walk-in</option>
                    <option value="Phone Call">Phone Call</option>
                    <option value="Email">Email</option>
                    <option value="Manual Entry">Manual Entry</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Course */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Course Interest</label>
                  <select
                    value={newLead.course || ''}
                    onChange={(e) => setNewLead({...newLead, course: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Course</option>
                    <option value="Internal Medicine">Internal Medicine</option>
                    <option value="Pulmonary">Pulmonary</option>
                    <option value="Cardiology">Cardiology</option>
                    <option value="Dermatology">Dermatology</option>
                    <option value="Neurology">Neurology</option>
                    <option value="Psychiatry">Psychiatry</option>
                    <option value="Emergency Medicine">Emergency Medicine</option>
                    <option value="Family Medicine">Family Medicine</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={newLead.status || 'new'}
                    onChange={(e) => setNewLead({...newLead, status: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="qualified">Qualified</option>
                    <option value="hot">Hot</option>
                    <option value="warm">Warm</option>
                    <option value="cold">Cold</option>
                    <option value="Followup">Follow-up</option>
                    <option value="interested">Interested</option>
                    <option value="Not interested">Not Interested</option>
                    <option value="will enroll later">Will Enroll Later</option>
                    <option value="converted">Converted</option>
                  </select>
                </div>

                {/* Assigned To */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Assign To</label>
                  <select
                    value={newLead.assignedTo || ''}
                    onChange={(e) => setNewLead({...newLead, assignedTo: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Auto-assign to me</option>
                    <option value="Arti Mohd">Arti Mohd</option>
                    <option value="Beenish">Beenish</option>
                    <option value="Sarah Johnson">Sarah Johnson</option>
                    <option value="Mike Chen">Mike Chen</option>
                    <option value="Emma Wilson">Emma Wilson</option>
                  </select>
                </div>

                {/* Follow-up Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Follow-up Date</label>
                  <input
                    type="date"
                    value={newLead.followUp || ''}
                    onChange={(e) => setNewLead({...newLead, followUp: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end space-x-3">
              <button
                onClick={handleCancelAddLead}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNewLead}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add Lead</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* No leads found */}
      {filteredLeads.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-200 mt-6">
          <Target className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No leads found</h3>
          <p className="text-gray-500 mb-4">
            Try adjusting your search criteria or filters to find more leads.
          </p>
          <button 
            onClick={handleAddLead}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Add Your First Lead
          </button>
        </div>
      )}
    </div>
  );
};

export default LeadsManagement;
