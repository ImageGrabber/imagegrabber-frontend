'use client';

import { useState } from 'react';
import { Filter, ArrowUpDown, X } from 'lucide-react';

export interface FilterOptions {
  minSize?: number;
  maxSize?: number;
  types: string[];
  qualities: string[];
  sortBy: 'filename' | 'size' | 'width' | 'height';
  sortOrder: 'asc' | 'desc';
}

interface ImageFilterBarProps {
  onFilterChange: (filters: FilterOptions) => void;
  imageCount: number;
  filteredCount: number;
  onDownloadAll: () => void;
  filteredAndSortedImages: any[];
}

export default function ImageFilterBar({ 
  onFilterChange, 
  imageCount, 
  filteredCount,
  onDownloadAll,
  filteredAndSortedImages
}: ImageFilterBarProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    types: [],
    qualities: [],
    sortBy: 'filename',
    sortOrder: 'asc'
  });

  const handleFilterChange = (newFilters: Partial<FilterOptions>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    onFilterChange(updatedFilters);
  };

  const clearFilters = () => {
    const clearedFilters: FilterOptions = {
      types: [],
      qualities: [],
      sortBy: 'filename',
      sortOrder: 'asc'
    };
    setFilters(clearedFilters);
    onFilterChange(clearedFilters);
  };

  const hasActiveFilters = filters.minSize || filters.maxSize || filters.types.length > 0 || filters.qualities.length > 0;

  return (
    <div className="mb-6 space-y-4">
      {/* Filter Toggle and Results */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-medium transition-all duration-200 ${
              showFilters || hasActiveFilters
                ? 'bg-blue-600 text-white shadow-lg hover:bg-blue-700'
                : 'bg-gray-800/80 text-gray-200 hover:bg-gray-700/80 border border-gray-600/50'
            }`}
          >
            <Filter className="h-4 w-4" />
            Filters
            {hasActiveFilters && (
              <span className="ml-1 rounded-full bg-white/20 px-2 py-0.5 text-xs">
                Active
              </span>
            )}
          </button>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 rounded-full px-4 py-2 text-sm text-gray-400 hover:text-gray-200 hover:bg-gray-800/50 transition-all duration-200"
            >
              <X className="h-3 w-3" />
              Clear all
            </button>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-300">
            Showing {filteredCount} of {imageCount} images
          </div>
          
          <button
            onClick={onDownloadAll}
            disabled={filteredAndSortedImages.length === 0}
            className="flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-medium transition-all duration-200 bg-gray-800/80 text-gray-200 hover:bg-gray-700/80 border border-gray-600/50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download {filteredAndSortedImages.length > 0 ? `Filtered (${filteredAndSortedImages.length})` : 'All'} Images
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="rounded-xl border border-gray-700/50 bg-gray-900/80 backdrop-blur-sm p-6 shadow-xl">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {/* Sort Options */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-200">
                Sort by
              </label>
              <div className="space-y-2">
                <select
                  value={filters.sortBy}
                  onChange={(e) => handleFilterChange({ 
                    sortBy: e.target.value as FilterOptions['sortBy'] 
                  })}
                  className="w-full rounded-lg border border-gray-600/50 bg-gray-800/80 px-3 py-2 text-sm text-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="filename">Filename</option>
                  <option value="size">File Size</option>
                  <option value="width">Width</option>
                  <option value="height">Height</option>
                </select>
                <button
                  onClick={() => handleFilterChange({ 
                    sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc' 
                  })}
                  className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-200 transition-colors"
                >
                  <ArrowUpDown className="h-3 w-3" />
                  {filters.sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                </button>
              </div>
            </div>

            {/* Size Filter */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-200">
                File Size (KB)
              </label>
              <div className="space-y-2">
                <input
                  type="number"
                  placeholder="Min size"
                  value={filters.minSize || ''}
                  onChange={(e) => handleFilterChange({ 
                    minSize: e.target.value ? parseInt(e.target.value) * 1024 : undefined 
                  })}
                  className="w-full rounded-lg border border-gray-600/50 bg-gray-800/80 px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <input
                  type="number"
                  placeholder="Max size"
                  value={filters.maxSize ? Math.round(filters.maxSize / 1024) : ''}
                  onChange={(e) => handleFilterChange({ 
                    maxSize: e.target.value ? parseInt(e.target.value) * 1024 : undefined 
                  })}
                  className="w-full rounded-lg border border-gray-600/50 bg-gray-800/80 px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Image Type Filter */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-200">
                Image Type
              </label>
              <div className="space-y-2">
                {['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'].map(type => (
                  <label key={type} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={filters.types.includes(type)}
                      onChange={(e) => {
                        const newTypes = e.target.checked
                          ? [...filters.types, type]
                          : filters.types.filter(t => t !== type);
                        handleFilterChange({ types: newTypes });
                      }}
                      className="rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-900"
                    />
                    <span className="text-sm text-gray-300">
                      {type.split('/')[1].toUpperCase()}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Quality Filter */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-200">
                Quality
              </label>
              <div className="space-y-2">
                {['high', 'medium', 'low'].map(quality => (
                  <label key={quality} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={filters.qualities.includes(quality)}
                      onChange={(e) => {
                        const newQualities = e.target.checked
                          ? [...filters.qualities, quality]
                          : filters.qualities.filter(q => q !== quality);
                        handleFilterChange({ qualities: newQualities });
                      }}
                      className="rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-900"
                    />
                    <span className="text-sm text-gray-300 capitalize">
                      {quality}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 