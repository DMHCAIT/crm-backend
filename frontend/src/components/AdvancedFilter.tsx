import React, { useState, useEffect } from 'react';
import { Filter, X, Calendar, Search, ChevronDown, CheckCircle } from 'lucide-react';

interface FilterOption {
  id: string;
  label: string;
  value: any;
  count?: number;
}

interface FilterGroup {
  id: string;
  label: string;
  type: 'select' | 'multiselect' | 'date' | 'range' | 'search';
  options?: FilterOption[];
  value?: any;
  placeholder?: string;
  min?: number;
  max?: number;
}

interface AdvancedFilterProps {
  filters: FilterGroup[];
  onFiltersChange: (filters: Record<string, any>) => void;
  onReset: () => void;
  resultCount?: number;
  isLoading?: boolean;
}

const AdvancedFilter: React.FC<AdvancedFilterProps> = ({
  filters,
  onFiltersChange,
  onReset,
  resultCount,
  isLoading = false
}) => {
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});
  const [isExpanded, setIsExpanded] = useState(false);
  const [openDropdowns, setOpenDropdowns] = useState<Set<string>>(new Set());

  useEffect(() => {
    onFiltersChange(activeFilters);
  }, [activeFilters, onFiltersChange]);

  const updateFilter = (filterId: string, value: any) => {
    setActiveFilters(prev => ({
      ...prev,
      [filterId]: value
    }));
  };

  const removeFilter = (filterId: string) => {
    setActiveFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[filterId];
      return newFilters;
    });
  };

  const handleReset = () => {
    setActiveFilters({});
    onReset();
  };

  const toggleDropdown = (filterId: string) => {
    setOpenDropdowns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(filterId)) {
        newSet.delete(filterId);
      } else {
        newSet.add(filterId);
      }
      return newSet;
    });
  };

  const getActiveFilterCount = () => {
    return Object.keys(activeFilters).filter(key => {
      const value = activeFilters[key];
      if (Array.isArray(value)) return value.length > 0;
      return value !== undefined && value !== '' && value !== null;
    }).length;
  };

  const renderFilterInput = (filter: FilterGroup) => {
    const value = activeFilters[filter.id];

    switch (filter.type) {
      case 'search':
        return (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={filter.placeholder || 'Search...'}
              value={value || ''}
              onChange={(e) => updateFilter(filter.id, e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        );

      case 'date':
        return (
          <div className="grid grid-cols-2 gap-2">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={value?.start || ''}
                onChange={(e) => updateFilter(filter.id, { ...value, start: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={value?.end || ''}
                onChange={(e) => updateFilter(filter.id, { ...value, end: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        );

      case 'range':
        return (
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              placeholder={`Min ${filter.min || 0}`}
              value={value?.min || ''}
              onChange={(e) => updateFilter(filter.id, { ...value, min: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <input
              type="number"
              placeholder={`Max ${filter.max || 100}`}
              value={value?.max || ''}
              onChange={(e) => updateFilter(filter.id, { ...value, max: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        );

      case 'select':
        return (
          <div className="relative">
            <button
              onClick={() => toggleDropdown(filter.id)}
              className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <span className={value ? 'text-gray-900' : 'text-gray-500'}>
                {value ? filter.options?.find(opt => opt.value === value)?.label : filter.placeholder || 'Select...'}
              </span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>
            
            {openDropdowns.has(filter.id) && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {filter.options?.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => {
                      updateFilter(filter.id, option.value);
                      toggleDropdown(filter.id);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center justify-between"
                  >
                    <span>{option.label}</span>
                    {option.count && (
                      <span className="text-sm text-gray-500">({option.count})</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        );

      case 'multiselect':
        const selectedValues = value || [];
        return (
          <div className="relative">
            <button
              onClick={() => toggleDropdown(filter.id)}
              className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <span className={selectedValues.length > 0 ? 'text-gray-900' : 'text-gray-500'}>
                {selectedValues.length > 0 
                  ? `${selectedValues.length} selected`
                  : filter.placeholder || 'Select...'}
              </span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>
            
            {openDropdowns.has(filter.id) && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {filter.options?.map((option) => {
                  const isSelected = selectedValues.includes(option.value);
                  return (
                    <button
                      key={option.id}
                      onClick={() => {
                        const newValues = isSelected
                          ? selectedValues.filter((v: any) => v !== option.value)
                          : [...selectedValues, option.value];
                        updateFilter(filter.id, newValues);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-2">
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                          isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                        }`}>
                          {isSelected && <CheckCircle className="w-3 h-3 text-white" />}
                        </div>
                        <span>{option.label}</span>
                      </div>
                      {option.count && (
                        <span className="text-sm text-gray-500">({option.count})</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <Filter className="w-5 h-5 text-gray-600" />
          <h3 className="font-medium text-gray-900">Filters</h3>
          {getActiveFilterCount() > 0 && (
            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
              {getActiveFilterCount()} active
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {resultCount !== undefined && (
            <span className="text-sm text-gray-600">
              {isLoading ? 'Loading...' : `${resultCount} results`}
            </span>
          )}
          
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ChevronDown className={`w-4 h-4 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Active Filters */}
      {getActiveFilterCount() > 0 && (
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex flex-wrap gap-2">
            {Object.entries(activeFilters).map(([key, value]) => {
              if (!value || (Array.isArray(value) && value.length === 0)) return null;
              
              const filter = filters.find(f => f.id === key);
              if (!filter) return null;

              let displayValue = value;
              if (filter.type === 'multiselect' && Array.isArray(value)) {
                displayValue = `${value.length} selected`;
              } else if (filter.type === 'select') {
                displayValue = filter.options?.find(opt => opt.value === value)?.label || value;
              } else if (filter.type === 'date' && value.start && value.end) {
                displayValue = `${value.start} - ${value.end}`;
              } else if (filter.type === 'range' && (value.min || value.max)) {
                displayValue = `${value.min || 'Min'} - ${value.max || 'Max'}`;
              }

              return (
                <div
                  key={key}
                  className="flex items-center space-x-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                >
                  <span>{filter.label}: {displayValue}</span>
                  <button
                    onClick={() => removeFilter(key)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
            
            <button
              onClick={handleReset}
              className="text-sm text-gray-600 hover:text-gray-800 underline"
            >
              Clear all
            </button>
          </div>
        </div>
      )}

      {/* Filter Inputs */}
      {isExpanded && (
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filters.map((filter) => (
              <div key={filter.id}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {filter.label}
                </label>
                {renderFilterInput(filter)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedFilter;
