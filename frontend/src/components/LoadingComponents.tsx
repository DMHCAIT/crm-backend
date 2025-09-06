import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'blue' | 'white' | 'gray';
  text?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  color = 'blue',
  text 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  const colorClasses = {
    blue: 'text-blue-600',
    white: 'text-white',
    gray: 'text-gray-600'
  };

  return (
    <div className="flex items-center justify-center space-x-2">
      <svg
        className={`animate-spin ${sizeClasses[size]} ${colorClasses[color]}`}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        ></circle>
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        ></path>
      </svg>
      {text && <span className={`text-sm ${colorClasses[color]}`}>{text}</span>}
    </div>
  );
};

export const SkeletonLoader: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse bg-gray-200 rounded ${className}`}></div>
);

export const CardSkeleton: React.FC = () => (
  <div className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
    <div className="flex items-center space-x-4 mb-4">
      <SkeletonLoader className="w-10 h-10 rounded-full" />
      <div className="space-y-2 flex-1">
        <SkeletonLoader className="h-4 w-3/4" />
        <SkeletonLoader className="h-3 w-1/2" />
      </div>
    </div>
    <div className="space-y-3">
      <SkeletonLoader className="h-3 w-full" />
      <SkeletonLoader className="h-3 w-4/5" />
      <SkeletonLoader className="h-3 w-3/5" />
    </div>
  </div>
);

export const TableSkeleton: React.FC<{ rows?: number; cols?: number }> = ({ 
  rows = 5, 
  cols = 4 
}) => (
  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
    <div className="border-b border-gray-200 p-4">
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {Array.from({ length: cols }).map((_, i) => (
          <SkeletonLoader key={i} className="h-4 w-full" />
        ))}
      </div>
    </div>
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={rowIndex} className="border-b border-gray-100 p-4 last:border-b-0">
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {Array.from({ length: cols }).map((_, colIndex) => (
            <SkeletonLoader key={colIndex} className="h-4 w-full" />
          ))}
        </div>
      </div>
    ))}
  </div>
);

export const PageSkeleton: React.FC = () => (
  <div className="p-6 space-y-6 animate-pulse">
    {/* Header */}
    <div className="flex justify-between items-center">
      <div className="space-y-2">
        <SkeletonLoader className="h-8 w-64" />
        <SkeletonLoader className="h-4 w-96" />
      </div>
      <SkeletonLoader className="h-10 w-32" />
    </div>

    {/* Stats Cards */}
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <SkeletonLoader className="h-4 w-20" />
              <SkeletonLoader className="h-8 w-16" />
            </div>
            <SkeletonLoader className="w-10 h-10 rounded-lg" />
          </div>
        </div>
      ))}
    </div>

    {/* Main Content */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <CardSkeleton />
      </div>
      <div>
        <CardSkeleton />
      </div>
    </div>
  </div>
);

export default {
  LoadingSpinner,
  SkeletonLoader,
  CardSkeleton,
  TableSkeleton,
  PageSkeleton
};
