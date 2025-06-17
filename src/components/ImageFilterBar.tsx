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
}

export default function ImageFilterBar({ 
  onFilterChange, 
  imageCount, 
  filteredCount 
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
            className={`flex items-center gap-2 rounded-lg px-4 py-2 transition-colors ${
              showFilters || hasActiveFilters
                ? 'bg-orange-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
            >
              <X className="h-3 w-3" />
              Clear all
            </button>
          )}
        </div>

        <div className="text-sm text-white">
          Showing {filteredCount} of {imageCount} images
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {/* Sort Options */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Sort by
              </label>
              <div className="space-y-2">
                <select
                  value={filters.sortBy}
                  onChange={(e) => handleFilterChange({ 
                    sortBy: e.target.value as FilterOptions['sortBy'] 
                  })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
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
                  className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800"
                >
                  <ArrowUpDown className="h-3 w-3" />
                  {filters.sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                </button>
              </div>
            </div>

            {/* Size Filter */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
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
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
                <input
                  type="number"
                  placeholder="Max size"
                  value={filters.maxSize ? Math.round(filters.maxSize / 1024) : ''}
                  onChange={(e) => handleFilterChange({ 
                    maxSize: e.target.value ? parseInt(e.target.value) * 1024 : undefined 
                  })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>
            </div>

            {/* Image Type Filter */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
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
                      className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                    />
                    <span className="text-sm text-gray-600">
                      {type.split('/')[1].toUpperCase()}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Quality Filter */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
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
                      className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                    />
                    <span className="text-sm text-gray-600 capitalize">
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