'use client';

import { useState, useEffect } from 'react';
import { History, Eye } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchHistory } from '@/contexts/SearchHistoryContext';
import Link from 'next/link';

interface SearchInputProps {
  onScrape: (url: string) => void;
  isLoading: boolean;
  initialUrl?: string;
  onUrlChange?: (url: string) => void;
}

export default function SearchInput({ onScrape, isLoading, initialUrl = '', onUrlChange }: SearchInputProps) {
  const [url, setUrl] = useState(initialUrl);
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);
  const { user } = useAuth();
  const { history } = useSearchHistory();

  useEffect(() => {
    setUrl(initialUrl);
  }, [initialUrl]);

  const handleUrlChange = (newUrl: string) => {
    setUrl(newUrl);
    onUrlChange?.(newUrl);
  };

  const handleSearch = () => {
    if (!url.trim()) return;
    onScrape(url.trim());
    setShowHistoryDropdown(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSearch();
    }
  };

  const selectFromHistory = (historicalUrl: string) => {
    handleUrlChange(historicalUrl);
    setShowHistoryDropdown(false);
  };

  // Get recent history (last 5 items)
  const recentHistory = history.slice(0, 5);

  return (
    <>
      <div className="relative">
        <input
          type="url"
          placeholder="https://example.com"
          value={url}
          onChange={(e) => handleUrlChange(e.target.value)}
          onKeyPress={handleKeyPress}
          className="w-full rounded-2xl border border-gray-600/50 bg-gray-800/80 py-4 px-6 pr-32 text-gray-200 placeholder-gray-400 outline-none transition-all duration-200 focus:border-blue-500/50 focus:bg-gray-800/90 focus:ring-2 focus:ring-blue-500/20"
          disabled={isLoading}
        />
        
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {/* History Button - Only show when logged in */}
          {user && (
            <div className="relative">
              <button 
                onClick={() => setShowHistoryDropdown(!showHistoryDropdown)}
                className="rounded-full p-2 text-gray-400 hover:bg-gray-700/50 hover:text-gray-200 transition-all duration-200"
                title="Search History"
              >
                <History className="h-4 w-4" />
              </button>

              {/* History Dropdown */}
              {showHistoryDropdown && (
                <div className="absolute right-0 mt-2 w-80 bg-gray-900/95 border border-gray-700/50 rounded-xl shadow-xl z-10 backdrop-blur-sm">
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium text-gray-200">Recent Searches</h3>
                      <Link 
                        href="/history"
                        className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                        onClick={() => setShowHistoryDropdown(false)}
                      >
                        <Eye className="h-3 w-3" />
                        View All
                      </Link>
                    </div>
                    
                    {recentHistory.length > 0 ? (
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {recentHistory.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => selectFromHistory(item.url)}
                            className="w-full text-left p-3 rounded-lg hover:bg-gray-800/50 transition-colors"
                          >
                            <div className="text-sm font-medium text-gray-200 truncate">
                              {item.title}
                            </div>
                            <div className="text-xs text-gray-400 truncate">
                              {item.url}
                            </div>
                            <div className="text-xs text-gray-500">
                              {item.image_count && `${item.image_count} images • `}
                              {new Date(item.created_at).toLocaleDateString()}
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 text-center py-4">
                        No search history yet
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <button
            onClick={handleSearch}
            disabled={isLoading || !url.trim()}
            className="rounded-xl bg-blue-600/80 border border-blue-500/50 px-6 py-2 font-medium text-white transition-all duration-200 hover:bg-blue-500/80 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Extracting...' : 'Extract'}
          </button>
        </div>
      </div>

      {/* Click outside to close dropdown */}
      {showHistoryDropdown && (
        <div 
          className="fixed inset-0 z-0" 
          onClick={() => setShowHistoryDropdown(false)}
        />
      )}
    </>
  );
} 