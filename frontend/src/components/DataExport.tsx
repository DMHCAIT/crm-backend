import React, { useState } from 'react';
import { Download, FileText, Calendar, Users, BarChart3, Filter, CheckCircle } from 'lucide-react';
import { LoadingSpinner } from './LoadingComponents';

interface ExportOption {
  id: string;
  name: string;
  description: string;
  icon: any;
  format: 'csv' | 'pdf' | 'xlsx';
  dataType: 'leads' | 'students' | 'analytics' | 'documents';
}

interface ExportFilters {
  dateRange: 'last_7_days' | 'last_30_days' | 'last_90_days' | 'custom';
  customStartDate?: string;
  customEndDate?: string;
  status?: string[];
  source?: string[];
  includeNotes?: boolean;
  includeDocuments?: boolean;
}

const DataExport: React.FC = () => {
  const [selectedExports, setSelectedExports] = useState<string[]>([]);
  const [filters, setFilters] = useState<ExportFilters>({
    dateRange: 'last_30_days',
    includeNotes: true,
    includeDocuments: false
  });
  const [isExporting, setIsExporting] = useState(false);
  const [exportHistory, setExportHistory] = useState<any[]>([]);

  const exportOptions: ExportOption[] = [
    {
      id: 'leads_csv',
      name: 'Leads Data (CSV)',
      description: 'Complete leads information with contact details and status',
      icon: Users,
      format: 'csv',
      dataType: 'leads'
    },
    {
      id: 'leads_pdf',
      name: 'Leads Report (PDF)',
      description: 'Formatted leads report with charts and summaries',
      icon: FileText,
      format: 'pdf',
      dataType: 'leads'
    },
    {
      id: 'students_csv',
      name: 'Students Data (CSV)',
      description: 'Student records with enrollment and academic information',
      icon: Users,
      format: 'csv',
      dataType: 'students'
    },
    {
      id: 'analytics_pdf',
      name: 'Analytics Report (PDF)',
      description: 'Comprehensive analytics with charts and insights',
      icon: BarChart3,
      format: 'pdf',
      dataType: 'analytics'
    },
    {
      id: 'documents_xlsx',
      name: 'Document Inventory (Excel)',
      description: 'Complete document registry with metadata',
      icon: FileText,
      format: 'xlsx',
      dataType: 'documents'
    }
  ];

  const handleExportSelection = (exportId: string) => {
    setSelectedExports(prev => 
      prev.includes(exportId) 
        ? prev.filter(id => id !== exportId)
        : [...prev, exportId]
    );
  };

  const handleExport = async () => {
    if (selectedExports.length === 0) return;

    setIsExporting(true);
    try {
      // Simulate export process
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Add to history
      const newExport = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        exports: selectedExports.map(id => exportOptions.find(opt => opt.id === id)?.name).join(', '),
        status: 'completed',
        downloadUrl: '#'
      };
      
      setExportHistory(prev => [newExport, ...prev]);
      setSelectedExports([]);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const getFormatColor = (format: string) => {
    switch (format) {
      case 'csv': return 'bg-green-100 text-green-800';
      case 'pdf': return 'bg-red-100 text-red-800';
      case 'xlsx': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Data Export</h1>
          <p className="text-gray-600 mt-1">Export your CRM data in various formats</p>
        </div>
        <button
          onClick={handleExport}
          disabled={selectedExports.length === 0 || isExporting}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isExporting ? (
            <LoadingSpinner size="sm" color="white" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          <span>{isExporting ? 'Exporting...' : 'Export Selected'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Export Options */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Data to Export</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {exportOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = selectedExports.includes(option.id);
                
                return (
                  <div
                    key={option.id}
                    className={`
                      border rounded-lg p-4 cursor-pointer transition-all
                      ${isSelected 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                      }
                    `}
                    onClick={() => handleExportSelection(option.id)}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`
                        w-10 h-10 rounded-lg flex items-center justify-center
                        ${isSelected ? 'bg-blue-100' : 'bg-gray-100'}
                      `}>
                        <Icon className={`w-5 h-5 ${isSelected ? 'text-blue-600' : 'text-gray-600'}`} />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-medium text-gray-900">{option.name}</h3>
                          <span className={`px-2 py-1 text-xs rounded ${getFormatColor(option.format)}`}>
                            {option.format.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{option.description}</p>
                      </div>
                      
                      {isSelected && (
                        <CheckCircle className="w-5 h-5 text-blue-600" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Export History */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Exports</h2>
            
            {exportHistory.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No exports yet</p>
            ) : (
              <div className="space-y-3">
                {exportHistory.map((exportItem) => (
                  <div key={exportItem.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{exportItem.exports}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(exportItem.date).toLocaleDateString()} at {new Date(exportItem.date).toLocaleTimeString()}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                        {exportItem.status}
                      </span>
                      <button className="text-blue-600 hover:text-blue-700 text-sm">
                        Download
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Filter className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Export Filters</h2>
            </div>

            <div className="space-y-4">
              {/* Date Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date Range
                </label>
                <select
                  value={filters.dateRange}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value as any }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="last_7_days">Last 7 days</option>
                  <option value="last_30_days">Last 30 days</option>
                  <option value="last_90_days">Last 90 days</option>
                  <option value="custom">Custom range</option>
                </select>
              </div>

              {filters.dateRange === 'custom' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={filters.customStartDate || ''}
                      onChange={(e) => setFilters(prev => ({ ...prev, customStartDate: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={filters.customEndDate || ''}
                      onChange={(e) => setFilters(prev => ({ ...prev, customEndDate: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              )}

              {/* Include Options */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-700">Include Additional Data</h3>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.includeNotes || false}
                    onChange={(e) => setFilters(prev => ({ ...prev, includeNotes: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Include Notes</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.includeDocuments || false}
                    onChange={(e) => setFilters(prev => ({ ...prev, includeDocuments: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Include Documents</span>
                </label>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Export Preview</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Selected Items:</span>
                <span className="text-sm font-medium text-gray-900">{selectedExports.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Date Range:</span>
                <span className="text-sm font-medium text-gray-900">
                  {filters.dateRange.replace('_', ' ')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Estimated Size:</span>
                <span className="text-sm font-medium text-gray-900">
                  {selectedExports.length * 2.5}MB
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataExport;
